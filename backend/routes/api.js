// backend/routes/api.js
import 'dotenv/config';
import express from 'express';  
import multer from 'multer';
import PinataSDK from '@pinata/sdk';
import streamifier from 'streamifier';
import { ethers } from 'ethers';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import Contract from "../models/Contract.js";
import TimeEntry from "../models/TimeEntry.js";
import User from "../models/User.js";
import mongoose from "mongoose";

import { createInvite, acceptInvite, getInviteNotifications } from '../controllers/contractController.js';
import { requestOtp, verifyOtp } from "../controllers/otpController.js";
import { signContract } from "../controllers/signController.js";

const router = express.Router();
router.use(express.json());

const upload = multer();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const registryJsonPath  = resolve(
  __dirname,
  '../../artifacts/contracts/ContractRegistry.sol/ContractRegistry.json'
);
const timesheetJsonPath = resolve(
  __dirname,
  '../../artifacts/contracts/TimeSheet.sol/TimeSheet.json'
);

const registryArtifact  = JSON.parse(fs.readFileSync(registryJsonPath, 'utf8'));
const timesheetArtifact = JSON.parse(fs.readFileSync(timesheetJsonPath, 'utf8'));

const registryAbi  = registryArtifact.abi;
const timesheetAbi = timesheetArtifact.abi;

// Pinata 세팅
const pinata = new PinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_API_SECRET
);

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const registry  = new ethers.Contract(process.env.CONTRACT_ADDRESS, registryAbi, wallet);
const timesheet = new ethers.Contract(process.env.TIMESHEET_ADDRESS, timesheetAbi, wallet);

// ================ REST API 라우트 =====================

// 회원가입
router.post("/register", async (req, res) => {
  try {
    const { name, email, walletAddress, role } = req.body;

    if (!name || !email || !walletAddress || !role) {
      return res.status(400).json({ error: "모든 필드(name, email, walletAddress, role)가 필요합니다." });
    }

    // 이미 등록된 지갑/이메일 있으면 막기
    const existing = await User.findOne({ $or: [{ walletAddress }, { email }] });
    if (existing) {
      return res.status(400).json({ error: "이미 가입된 이메일 또는 지갑 주소입니다." });
    }

    const user = await User.create({ name, email, walletAddress, role });
    res.json({ success: true, user });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 로그인 (지갑 기반)
router.post("/login", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress가 필요합니다." });
    }

    let user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "가입되지 않은 지갑입니다. 회원가입을 먼저 해주세요." });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// 계약 생성 (DB만 저장)
// ----------------------
router.post("/contracts", async (req, res) => {
  try {
    const doc = await Contract.create({
      ...req.body,
      status: "DRAFT", // 최초 상태는 DRAFT
    });
    res.status(201).json(doc);
  } catch (e) {
    console.error("create contract error:", e);
    res.status(400).json({ error: e.message });
  }
});

// 초대 & 수락
router.post('/contracts/:id/invite', createInvite);
router.post('/contracts/:id/accept', acceptInvite);

// 초대 알림 조회
router.get('/notifications/:address', getInviteNotifications);

// OTP
router.post('/contracts/:id/request-otp', requestOtp);
router.post('/contracts/:id/verify-otp', verifyOtp);

// 서명 & 최종 승인 (signController에서 PDF/IPFS/OnChain까지)
router.post('/contracts/:id/sign', signContract);

// 파일 업로드 → IPFS
router.post('/uploadContract', upload.single('contract'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'contract 필드에 파일을 첨부해주세요.' });
    }
    const readStream = streamifier.createReadStream(req.file.buffer);
    const result = await pinata.pinFileToIPFS(readStream, {
      pinataMetadata: { name: req.file.originalname }
    });
    return res.json({ cid: result.IpfsHash });
  } catch (err) {
    console.error('uploadContract error', err);
    return res.status(500).json({ error: err.message || '파일 업로드 중 오류' });
  }
});

// ✅ 출근 (로컬 DB만 저장)
router.post("/clock-in", async (req, res) => {
  try {
    const { id, walletAddress } = req.body;
    if (!id || !walletAddress) {
      return res.status(400).json({ error: "id와 walletAddress가 필요합니다." });
    }

    // contractId 찾기 (id가 _id일 수도 있고 contractId일 수도 있음)
    let contractId = id;
    if (mongoose.Types.ObjectId.isValid(id)) {
      const contract = await Contract.findById(id);
      if (contract) {
        contractId = contract.contractId;
      }
    } else {
      // contractId인 경우도 확인
      const contract = await Contract.findOne({ contractId: id });
      if (!contract) {
        return res.status(404).json({ error: "계약을 찾을 수 없습니다." });
      }
      contractId = contract.contractId;
    }

    // DB에만 저장 (블록체인 X)
    const entry = new TimeEntry({
      contractId: contractId,
      walletAddress,
      inTime: new Date(),
      status: "PENDING", // 승인 대기 상태
    });
    await entry.save();

    res.json({ success: true, message: "출근 기록이 저장되었습니다. 고용주 승인을 기다리는 중입니다." });
  } catch (err) {
    console.error("clock-in error:", err);
    res.status(500).json({ error: err.reason || err.message });
  }
});

// ✅ 퇴근 (로컬 DB만 저장)
router.post("/clock-out", async (req, res) => {
  try {
    const { id, walletAddress } = req.body;
    if (!id || !walletAddress) {
      return res.status(400).json({ error: "id와 walletAddress가 필요합니다." });
    }

    // contractId 찾기 (id가 _id일 수도 있고 contractId일 수도 있음)
    let contractId = id;
    if (mongoose.Types.ObjectId.isValid(id)) {
      const contract = await Contract.findById(id);
      if (contract) {
        contractId = contract.contractId;
      }
    } else {
      // contractId인 경우도 확인
      const contract = await Contract.findOne({ contractId: id });
      if (!contract) {
        return res.status(404).json({ error: "계약을 찾을 수 없습니다." });
      }
      contractId = contract.contractId;
    }

    // DB 업데이트 (마지막 출근 기록 찾아서 퇴근 기록 추가)
    const entry = await TimeEntry.findOne({ 
      contractId: contractId, 
      walletAddress, 
      status: "PENDING",
      outTime: { $exists: false } 
    }).sort({ createdAt: -1 });
    
    if (!entry) {
      return res.status(400).json({ error: "출근 기록을 찾을 수 없습니다." });
    }

    entry.outTime = new Date();
    entry.status = "PENDING"; // 여전히 승인 대기
    await entry.save();

    // 근무 시간 계산
    const workHours = (entry.outTime - entry.inTime) / (1000 * 60 * 60); // 시간 단위
    entry.workHours = Math.round(workHours * 100) / 100; // 소수점 2자리
    await entry.save();

    res.json({ 
      success: true, 
      message: "퇴근 기록이 저장되었습니다. 고용주 승인을 기다리는 중입니다.",
      workHours: entry.workHours
    });
  } catch (err) {
    console.error("clock-out error:", err);
    res.status(500).json({ error: err.reason || err.message });
  }
});

// ✅ 고용주 승인 (블록체인에 배치 업로드)
router.post("/approve-timesheet", async (req, res) => {
  try {
    const { contractId, entryIds } = req.body;
    if (!contractId || !entryIds || !Array.isArray(entryIds)) {
      return res.status(400).json({ error: "contractId와 entryIds 배열이 필요합니다." });
    }

    // 승인할 엔트리들 조회
    const entries = await TimeEntry.find({ 
      _id: { $in: entryIds },
      contractId,
      status: "PENDING"
    });

    if (entries.length === 0) {
      return res.status(400).json({ error: "승인할 기록이 없습니다." });
    }

    const txHashes = [];
    const failedEntries = [];
    
    // 블록체인에서 현재 계약의 마지막 entry 상태 확인
    let lastBlockchainEntry = null;
    try {
      const filterIn = timesheet.filters.ClockIn(contractId);
      const filterOut = timesheet.filters.ClockOut(contractId);
      const fromBlock = process.env.LOGS_FROM_BLOCK ? Number(process.env.LOGS_FROM_BLOCK) : 0;
      const logsIn = await timesheet.queryFilter(filterIn, fromBlock, 'latest');
      const logsOut = await timesheet.queryFilter(filterOut, fromBlock, 'latest');
      
      // 마지막 출근 기록 찾기
      if (logsIn.length > 0) {
        const lastInLog = logsIn[logsIn.length - 1];
        const matchingOutLog = logsOut.find(log => 
          log.args.worker.toLowerCase() === lastInLog.args.worker.toLowerCase() &&
          Number(log.args.time) > Number(lastInLog.args.time)
        );
        
        lastBlockchainEntry = {
          hasClockIn: true,
          hasClockOut: !!matchingOutLog,
          worker: lastInLog.args.worker
        };
      }
    } catch (checkError) {
      console.error("Failed to check blockchain state:", checkError);
      // 블록체인 상태 확인 실패해도 계속 진행
    }
    
    // 각 엔트리를 블록체인에 업로드
    for (const entry of entries) {
      try {
        // ⚠️ 주의: 현재 스마트 컨트랙트는 현재 시간과 서버 지갑 주소로만 기록 가능
        // 실제 entry의 walletAddress와 inTime/outTime은 블록체인에 저장되지 않음
        // DB에만 저장된 실제 시간 정보를 사용하고, 블록체인에는 기록만 남김
        
        // 마지막 블록체인 entry에 퇴근 기록이 없으면 먼저 퇴근 처리
        if (lastBlockchainEntry && lastBlockchainEntry.hasClockIn && !lastBlockchainEntry.hasClockOut) {
          try {
            // 기존 출근에 퇴근 추가
            const existingOutTx = await timesheet.clockOut(contractId);
            await existingOutTx.wait();
            lastBlockchainEntry.hasClockOut = true;
          } catch (outError) {
            console.error(`Failed to clock out existing entry:`, outError);
            // 퇴근 실패해도 계속 진행 (새로운 출근 시도)
          }
        }
        
        // 출근 트랜잭션
        const inTx = await timesheet.clockIn(contractId);
        await inTx.wait();
        lastBlockchainEntry = { hasClockIn: true, hasClockOut: false };
        
        // 퇴근 트랜잭션 (퇴근 시간이 있는 경우)
        let outTx = null;
        if (entry.outTime) {
          outTx = await timesheet.clockOut(contractId);
          await outTx.wait();
          if (lastBlockchainEntry) {
            lastBlockchainEntry.hasClockOut = true;
          }
        }

        // DB 업데이트 (성공한 경우에만)
        entry.txHashIn = inTx.hash;
        entry.txHashOut = outTx?.hash;
        entry.status = "APPROVED";
        await entry.save();

        txHashes.push({
          entryId: entry._id,
          inTx: inTx.hash,
          outTx: outTx?.hash
        });

      } catch (txError) {
        console.error(`Transaction failed for entry ${entry._id}:`, txError);
        console.error(`Entry details:`, {
          contractId: entry.contractId,
          walletAddress: entry.walletAddress,
          inTime: entry.inTime,
          outTime: entry.outTime
        });
        console.error(`Current blockchain state:`, lastBlockchainEntry);
        failedEntries.push({
          entryId: entry._id,
          error: txError.message || txError.reason || "Unknown error",
          details: txError.toString()
        });
      }
    }

    // 실패한 항목이 있으면 에러 반환
    if (failedEntries.length > 0) {
      return res.status(500).json({ 
        error: `${failedEntries.length}개 기록의 블록체인 업로드가 실패했습니다.`,
        failedEntries,
        successCount: txHashes.length
      });
    }

    // 모든 항목이 성공한 경우
    if (txHashes.length === 0) {
      return res.status(400).json({ 
        error: "승인할 기록이 없거나 모든 기록의 업로드가 실패했습니다." 
      });
    }

    res.json({ 
      success: true, 
      message: `${txHashes.length}개 기록이 승인되어 블록체인에 등록되었습니다.`,
      txHashes 
    });

  } catch (err) {
    console.error("approve-timesheet error:", err);
    res.status(500).json({ error: err.reason || err.message });
  }
});

// ✅ 승인 대기 중인 출퇴근 로그 조회 (고용주용)
router.get("/pending-entries/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;
    const entries = await TimeEntry.find({ 
      contractId, 
      status: "PENDING" 
    }).sort({ createdAt: -1 });

    res.json({ entries });
  } catch (err) {
    console.error("pending-entries error:", err);
    res.status(500).json({ error: err.message });
  }
});

  // 출퇴근 로그 조회 (DB + 온체인 이벤트)
router.get('/entries/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;

    // DB에서 기록 조회
      const dbEntries = await TimeEntry.find({ contractId });

      // 온체인 이벤트 조회 (실패해도 DB 데이터는 반환)
      let logsIn = [];
      let logsOut = [];
      try {
        const filterIn = timesheet.filters.ClockIn(contractId);
        const filterOut = timesheet.filters.ClockOut(contractId);
        // 너무 과한 범위를 막기 위해 조회 범위 제한 (환경변수로 시작 블록 지정 가능)
        const fromBlock = process.env.LOGS_FROM_BLOCK
          ? Number(process.env.LOGS_FROM_BLOCK)
          : 0;
        const toBlock = 'latest';
        logsIn = await timesheet.queryFilter(filterIn, fromBlock, toBlock);
        logsOut = await timesheet.queryFilter(filterOut, fromBlock, toBlock);
      } catch (chainErr) {
        console.error('entries chain logs error', chainErr);
        logsIn = [];
        logsOut = [];
      }

      // 응답 데이터 합치기
      res.json({
        dbEntries: dbEntries.map(e => ({
          walletAddress: e.walletAddress,
          inTime: e.inTime,
          outTime: e.outTime,
          txHashIn: e.txHashIn,
          txHashOut: e.txHashOut,
          status: e.status,          // ✅ 상태 포함
          workHours: e.workHours,    // ✅ 근무시간 포함
          _id: e._id,                // ✅ 테이블 선택용
        })),
      chainLogs: {
        clockIns: logsIn.map(l => ({
          worker: l.args.worker,
          time: Number(l.args.time),
          txHash: l.transactionHash,   // 🔥 Etherscan 링크에 활용 가능
        })),
        clockOuts: logsOut.map(l => ({
          worker: l.args.worker,
          time: Number(l.args.time),
          txHash: l.transactionHash,
        })),
      }
    });
  } catch (err) {
    console.error('entries error', err);
    res.status(500).json({ error: err.reason || err.message || '기록 조회 오류' });
  }
});

// 특정 근로자의 모든 출퇴근 기록 조회
router.get('/timesheet/:id/worker/:address', async (req, res) => {
  try {
    const { id, address } = req.params;
    const records = await timesheet.getEntriesByWorker(id, address);
    res.json({
      success: true,
      records: records.map(r => ({
        worker: r.worker,
        inTime: Number(r.inTime),
        outTime: Number(r.outTime)
      }))
    });
  } catch (err) {
    console.error('getEntriesByWorker error', err);
    res.status(500).json({ success: false, error: err.reason || err.message });
  }
});

// 특정 근로자의 가장 최근 기록 조회
router.get('/timesheet/:id/worker/:address/latest', async (req, res) => {
  try {
    const { id, address } = req.params;
    const latest = await timesheet.getLatestEntry(id, address);
    res.json({
      success: true,
      latest: {
        worker: latest.worker,
        inTime: Number(latest.inTime),
        outTime: Number(latest.outTime)
      }
    });
  } catch (err) {
    console.error('getLatestEntry error', err);
    res.status(500).json({ success: false, error: err.reason || err.message });
  }
});

// 고용주의 승인 요청 알림 조회 (계약 정보, 근로자 정보 포함)
router.get('/employer/time-entries/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // 고용주가 소유한 모든 계약 조회
    const contracts = await Contract.find({
      "employer.address": address.toLowerCase()
    });
    
    const contractIds = contracts.map(c => c.contractId);
    const contractMongoIds = contracts.map(c => c._id.toString()).filter(Boolean);
    const contractMap = {};
    contracts.forEach(c => {
      contractMap[c.contractId] = c;
      if (c._id) contractMap[c._id.toString()] = c;
    });
    
    // 해당 계약들의 승인 대기 중인 출퇴근 기록 조회
    // contractId는 contractId 필드에 저장되지만, 혹시 모를 경우를 대비해 두 가지 모두 검색
    const entries = await TimeEntry.find({
      $or: [
        { contractId: { $in: contractIds } },
        { contractId: { $in: contractMongoIds } }
      ],
      status: "PENDING"
    }).sort({ createdAt: -1 });
    
    // 알림 데이터 구성
    const notifications = [];
    entries.forEach(entry => {
      // contractId로 먼저 찾고, 없으면 _id로 찾기
      let contract = contractMap[entry.contractId];
      if (!contract && mongoose.Types.ObjectId.isValid(entry.contractId)) {
        contract = contractMap[entry.contractId];
      }
      // 여전히 없으면 DB에서 직접 조회
      if (!contract) {
        if (mongoose.Types.ObjectId.isValid(entry.contractId)) {
          contract = contracts.find(c => c._id.toString() === entry.contractId);
        } else {
          contract = contracts.find(c => c.contractId === entry.contractId);
        }
      }
      
      // 고용주의 커스텀 이름 확인 (없으면 기본 title 사용)
      let contractName = contract?.title || "알 수 없는 계약";
      if (contract?.customNames) {
        const customName = contract.customNames.find(
          cn => cn.address.toLowerCase() === address.toLowerCase() && cn.role === "EMPLOYER"
        );
        if (customName?.customName) {
          contractName = customName.customName;
        }
      }
      
      // 근로자 이름 조회
      const employeeName = contract?.employee?.name || (contract?.employee?.address ? contract.employee.address.slice(0, 6) + "..." : "근로자") || "근로자";
      
      if (entry.inTime) {
        const inDate = new Date(entry.inTime);
        const dateStr = `${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, '0')}-${String(inDate.getDate()).padStart(2, '0')}`;
        
        notifications.push({
          id: `in_${entry._id}`,
          contractId: entry.contractId,
          contractName,
          employeeName,
          type: "출근",
          date: dateStr,
          status: entry.status,
          entryId: entry._id.toString(),
          createdAt: entry.createdAt || entry.inTime
        });
      }
      
      if (entry.outTime) {
        const outDate = new Date(entry.outTime);
        const dateStr = `${outDate.getFullYear()}-${String(outDate.getMonth() + 1).padStart(2, '0')}-${String(outDate.getDate()).padStart(2, '0')}`;
        
        notifications.push({
          id: `out_${entry._id}`,
          contractId: entry.contractId,
          contractName,
          employeeName,
          type: "퇴근",
          date: dateStr,
          status: entry.status,
          entryId: entry._id.toString(),
          createdAt: entry.outTime || entry.updatedAt
        });
      }
    });
    
    // 날짜 최신순으로 정렬
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ notifications, total: notifications.length });
  } catch (err) {
    console.error('employer time-entries error', err);
    res.status(500).json({ error: err.message || '기록 조회 오류' });
  }
});

// 근로자의 모든 출퇴근 기록 알림 조회 (계약 정보 포함)
router.get('/worker/time-entries/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // 해당 근로자의 모든 출퇴근 기록 조회
    const entries = await TimeEntry.find({
      walletAddress: address.toLowerCase()
    }).sort({ createdAt: -1 });
    
    // 계약 정보 가져오기
    const contractIds = [...new Set(entries.map(e => e.contractId))];
    const contracts = await Contract.find({
      $or: [
        { contractId: { $in: contractIds } },
        { _id: { $in: contractIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } }
      ]
    });
    
    const contractMap = {};
    contracts.forEach(c => {
      contractMap[c.contractId] = c;
      if (c._id) contractMap[c._id.toString()] = c;
    });
    
    // 알림 데이터 구성
    const notifications = [];
    entries.forEach(entry => {
      const contract = contractMap[entry.contractId] || (mongoose.Types.ObjectId.isValid(entry.contractId) ? contractMap[entry.contractId] : null);
      
      // 근로자의 커스텀 이름 확인 (없으면 기본 title 사용)
      let contractName = contract?.title || "알 수 없는 계약";
      if (contract?.customNames) {
        const customName = contract.customNames.find(
          cn => cn.address.toLowerCase() === address.toLowerCase() && cn.role === "EMPLOYEE"
        );
        if (customName?.customName) {
          contractName = customName.customName;
        }
      }
      
      if (entry.inTime) {
        const inDate = new Date(entry.inTime);
        const dateStr = `${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, '0')}-${String(inDate.getDate()).padStart(2, '0')}`;
        
        notifications.push({
          id: `in_${entry._id}`,
          contractId: entry.contractId,
          contractName,
          type: "출근",
          date: dateStr,
          status: entry.status,
          entryId: entry._id.toString(),
          createdAt: entry.createdAt || entry.inTime
        });
      }
      
      if (entry.outTime) {
        const outDate = new Date(entry.outTime);
        const dateStr = `${outDate.getFullYear()}-${String(outDate.getMonth() + 1).padStart(2, '0')}-${String(outDate.getDate()).padStart(2, '0')}`;
        
        notifications.push({
          id: `out_${entry._id}`,
          contractId: entry.contractId,
          contractName,
          type: "퇴근",
          date: dateStr,
          status: entry.status,
          entryId: entry._id.toString(),
          createdAt: entry.outTime || entry.updatedAt
        });
      }
    });
    
    // 날짜 최신순으로 정렬
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ notifications, total: notifications.length });
  } catch (err) {
    console.error('worker time-entries error', err);
    res.status(500).json({ error: err.message || '기록 조회 오류' });
  }
});

// ----------------------
// 계약 목록 조회 (DB)
// ----------------------
router.get("/contracts", async (req, res) => {
  try {
    const { q, employer, employee, status, from, to, page = 1, size = 10, showHidden, userAddress, userRole } = req.query;

    const filter = {};
    if (employer) filter["employer.address"] = employer.toLowerCase();
    if (employee) {
      const employeeAddr = employee.toLowerCase();
      // employee 필드가 있거나 invites에 있는 계약 모두 검색
      filter.$or = [
        { "employee.address": employeeAddr },
        { 
          "invites.invitee.address": employeeAddr,
          "invites.status": "ACCEPTED"
        }
      ];
      // 근로자 리스트 기본 가시성: ACCEPTED 이후 상태만 노출
      // 단, status 파라미터가 명시적으로 전달되지 않았을 때만 기본 필터 적용
      // status가 "ALL"이거나 undefined일 때만 기본 필터 적용
      if (!status || status === "ALL") {
        filter.status = { $in: [
          "ACCEPTED",
          "PENDING_SIGN",
          "SIGNED_EMP",
          "SIGNED_BOTH",
          "APPROVED",
        ] };
      }
    }
    
    // 디버깅: 필터 정보 로그 출력
    console.log("[GET /api/contracts] Filter:", JSON.stringify(filter, null, 2));
    console.log("[GET /api/contracts] Query params - employee:", employee, "employer:", employer, "status:", status);
    // status가 명시적으로 전달되었고 "ALL"이 아닐 때만 덮어쓰기
    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (from || to) {
      filter.createdAt = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }

    // 숨김 필터링: showHidden이 true가 아니고 사용자 정보가 있으면 숨김 제외
    if (showHidden !== "true" && userAddress && userRole) {
      filter["hiddenBy"] = {
        $not: {
          $elemMatch: {
            address: userAddress.toLowerCase(),
            role: userRole
          }
        }
      };
    } else if (showHidden === "true" && userAddress && userRole) {
      // 숨긴 계약만 조회
      filter["hiddenBy"] = {
        $elemMatch: {
          address: userAddress.toLowerCase(),
          role: userRole
        }
      };
    }

    let query = Contract.find(filter).sort({ createdAt: -1 });
    if (q) query = query.find({ $text: { $search: q } });

    const skip = (Number(page) - 1) * Number(size);
    let items = await query.skip(skip).limit(Number(size));
    
    // 기존 계약에 employee 정보가 없는 경우 invites에서 복원
    items = items.map(contract => {
      if (!contract.employee && contract.invites && contract.invites.length > 0) {
        const acceptedInvite = contract.invites.find(inv => 
          inv.status === 'ACCEPTED' && (inv.role === 'EMPLOYEE' || inv.role === 'WORKER')
        );
        if (acceptedInvite && acceptedInvite.invitee) {
          contract.employee = {
            address: acceptedInvite.invitee.address.toLowerCase(),
            name: acceptedInvite.invitee.name || ''
          };
          // 비동기로 저장 (에러는 무시)
          contract.save().catch(err => console.log('Failed to update employee info:', err));
        }
      }
      return contract;
    });

    const total = await Contract.countDocuments(q ? { ...filter, $text: { $search: q } } : filter);

    // 캐시 방지 헤더 설정
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json({ items, total, page: Number(page), size: Number(size) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------
// 계약 단건 조회 (DB)
// ----------------------
router.get("/contracts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const or = [{ contractId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });

    const doc = await Contract.findOne({ $or: or });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------
// 계약 숨기기/보이기 토글
// ----------------------
router.post("/contracts/:id/toggle-hidden", async (req, res) => {
  try {
    const { id } = req.params;
    const { address, role } = req.body;
    
    if (!address || !role) {
      return res.status(400).json({ error: "address와 role이 필요합니다." });
    }

    const or = [{ contractId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });

    const contract = await Contract.findOne({ $or: or });
    if (!contract) {
      return res.status(404).json({ error: "계약을 찾을 수 없습니다." });
    }

    const userAddress = address.toLowerCase();
    const hiddenIndex = contract.hiddenBy?.findIndex(
      h => h.address === userAddress && h.role === role
    );

    if (hiddenIndex >= 0) {
      // 숨김 해제
      contract.hiddenBy.splice(hiddenIndex, 1);
    } else {
      // 숨기기
      if (!contract.hiddenBy) contract.hiddenBy = [];
      contract.hiddenBy.push({
        address: userAddress,
        role: role,
        hiddenAt: new Date()
      });
    }

    await contract.save();
    res.json({ 
      success: true, 
      hidden: hiddenIndex < 0,
      contract 
    });
  } catch (e) {
    console.error("toggle-hidden error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ----------------------
// 계약 커스텀 이름 업데이트 (사용자별 독립적)
// ----------------------
router.post("/contracts/:id/update-name", async (req, res) => {
  try {
    const { id } = req.params;
    const { address, role, customName } = req.body;
    
    if (!address || !role) {
      return res.status(400).json({ error: "address와 role이 필요합니다." });
    }

    if (!customName || customName.trim() === "") {
      return res.status(400).json({ error: "customName이 필요합니다." });
    }

    const or = [{ contractId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });

    const contract = await Contract.findOne({ $or: or });
    if (!contract) {
      return res.status(404).json({ error: "계약을 찾을 수 없습니다." });
    }

    const userAddress = address.toLowerCase();
    
    // 기존 커스텀 이름 찾기
    if (!contract.customNames) contract.customNames = [];
    const existingIndex = contract.customNames.findIndex(
      cn => cn.address === userAddress && cn.role === role
    );

    if (existingIndex >= 0) {
      // 기존 항목 업데이트
      contract.customNames[existingIndex].customName = customName.trim();
      contract.customNames[existingIndex].updatedAt = new Date();
    } else {
      // 새 항목 추가
      contract.customNames.push({
        address: userAddress,
        role: role,
        customName: customName.trim(),
        updatedAt: new Date()
      });
    }

    await contract.save();
    res.json({ 
      success: true, 
      customName: customName.trim(),
      contract 
    });
  } catch (e) {
    console.error("update-name error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ----------------------
// 최종 승인된 계약만 조회
// ----------------------
router.get("/contracts/approved/list", async (req, res) => {
  try {
    const approved = await Contract.find({ status: "APPROVED" }).sort({ updatedAt: -1 });
    res.json({ items: approved, total: approved.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------
// 만료된 계약 조회 (근로자 경력 조회용)
// ----------------------
router.get("/contracts/expired/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const now = new Date();
    
    // APPROVED 상태인 계약 조회
    const approvedContracts = await Contract.find({
      "employee.address": address.toLowerCase(),
      status: "APPROVED"
    });
    
    // 계약 기간이 만료된 계약만 필터링
    const expiredContracts = approvedContracts.filter(contract => {
      const period = contract.docJson?.contractPeriod || {};
      // startDate/endDate 또는 start/end 모두 확인
      const endDate = period.endDate || period.end;
      
      if (!endDate) return false;
      
      const end = new Date(endDate);
      return end < now;
    }).sort((a, b) => {
      const aEnd = new Date(a.docJson?.contractPeriod?.endDate || a.docJson?.contractPeriod?.end || 0);
      const bEnd = new Date(b.docJson?.contractPeriod?.endDate || b.docJson?.contractPeriod?.end || 0);
      return bEnd - aEnd;
    });
    
    // 경력 형태로 변환
    const careers = expiredContracts.map((contract, index) => {
      const period = contract.docJson?.contractPeriod || {};
      // startDate/endDate 또는 start/end 모두 확인
      const startDate = period.startDate || period.start || contract.createdAt;
      const endDate = period.endDate || period.end || contract.updatedAt;
      
      const start = startDate ? new Date(startDate) : contract.createdAt;
      const end = endDate ? new Date(endDate) : contract.updatedAt;
      
      // 근무 기간 계산 (개월)
      const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
      
      return {
        careerId: contract.contractId,
        employerName: contract.employer.name || contract.employer.address,
        position: contract.docJson?.workplace || contract.title || "미지정",
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        workMonths: months > 0 ? months : 1,
        contractData: contract.toObject()
      };
    });
    
    res.json({ careers, total: careers.length });
  } catch (e) {
    console.error("expired contracts error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ----------------------
// 급여 계산 API
// ----------------------
router.get("/calculate-salary/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;
    const { year, month, walletAddress } = req.query;
    
    // 계약 정보 조회
    const or = [{ contractId }];
    if (mongoose.Types.ObjectId.isValid(contractId)) or.push({ _id: contractId });
    
    const contract = await Contract.findOne({ $or: or });
    if (!contract) {
      return res.status(404).json({ error: "계약을 찾을 수 없습니다." });
    }

    // 급여 정보 확인
    const wageType = contract.docJson?.wage?.type;
    const wageAmount = Number(contract.docJson?.wage?.amount || 0);
    
    if (!wageType || !wageAmount || wageAmount === 0) {
      return res.status(400).json({ error: "급여 정보가 설정되지 않았습니다." });
    }

    // 출퇴근 기록 조회
    const filter = { contractId: contract.contractId, status: "APPROVED" };
    if (walletAddress) filter.walletAddress = walletAddress.toLowerCase();
    
    let entries;
    if (year && month) {
      // 특정 월 조회
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      entries = await TimeEntry.find({
        ...filter,
        inTime: { $gte: startDate, $lte: endDate }
      });
    } else {
      // 전체 조회
      entries = await TimeEntry.find(filter);
    }

    // 총 근무 시간 계산
    const totalHours = entries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
    
    // 급여 계산
    let calculatedSalary = 0;
    let calculationDetail = {};

    if (wageType === "시급") {
      calculatedSalary = totalHours * wageAmount;
      calculationDetail = {
        type: "시급",
        baseAmount: wageAmount,
        totalHours: totalHours,
        calculation: `${totalHours.toFixed(2)}시간 × ${wageAmount.toLocaleString()}원 = ${calculatedSalary.toLocaleString()}원`
      };
    } else if (wageType === "월급") {
      // 계약된 월 근무시간 확인 (계약서에 없다면 기본값 사용)
      const contractedHoursPerMonth = contract.docJson?.workingConditions?.workHoursPerDay 
        ? Number(contract.docJson.workingConditions.workHoursPerDay) * 
          Number(contract.docJson.workingConditions.workDaysPerWeek || 5) * 4.33 // 주당 근무일 × 4.33주
        : 160; // 기본값: 주 40시간 기준
      
      if (year && month) {
        // 월별 계산
        calculatedSalary = (totalHours / contractedHoursPerMonth) * wageAmount;
        calculationDetail = {
          type: "월급",
          baseAmount: wageAmount,
          contractedHoursPerMonth: contractedHoursPerMonth,
          actualHours: totalHours,
          calculation: `${totalHours.toFixed(2)}시간 / ${contractedHoursPerMonth}시간 × ${wageAmount.toLocaleString()}원 = ${calculatedSalary.toLocaleString()}원`
        };
      } else {
        // 전체 기간 계산 (월 단위로)
        const months = entries.length > 0 
          ? (new Date(entries[entries.length - 1].inTime) - new Date(entries[0].inTime)) / (1000 * 60 * 60 * 24 * 30)
          : 0;
        calculatedSalary = Math.max(0, months) * wageAmount;
        calculationDetail = {
          type: "월급",
          baseAmount: wageAmount,
          months: months > 0 ? months.toFixed(2) : 0,
          calculation: `${months.toFixed(2)}개월 × ${wageAmount.toLocaleString()}원 = ${calculatedSalary.toLocaleString()}원`
        };
      }
    } else if (wageType === "연봉") {
      // 연봉 계산 (월별로 분할)
      const monthlySalary = wageAmount / 12;
      if (year && month) {
        // 월별 계산
        const contractedHoursPerMonth = contract.docJson?.workingConditions?.workHoursPerDay 
          ? Number(contract.docJson.workingConditions.workHoursPerDay) * 
            Number(contract.docJson.workingConditions.workDaysPerWeek || 5) * 4.33
          : 160;
        
        calculatedSalary = (totalHours / contractedHoursPerMonth) * monthlySalary;
        calculationDetail = {
          type: "연봉",
          baseAmount: wageAmount,
          monthlySalary: monthlySalary,
          contractedHoursPerMonth: contractedHoursPerMonth,
          actualHours: totalHours,
          calculation: `${totalHours.toFixed(2)}시간 / ${contractedHoursPerMonth}시간 × ${monthlySalary.toLocaleString()}원 = ${calculatedSalary.toLocaleString()}원`
        };
      } else {
        // 전체 기간 계산
        const months = entries.length > 0 
          ? (new Date(entries[entries.length - 1].inTime) - new Date(entries[0].inTime)) / (1000 * 60 * 60 * 24 * 30)
          : 0;
        calculatedSalary = Math.max(0, months) * monthlySalary;
        calculationDetail = {
          type: "연봉",
          baseAmount: wageAmount,
          monthlySalary: monthlySalary,
          months: months > 0 ? months.toFixed(2) : 0,
          calculation: `${months.toFixed(2)}개월 × ${monthlySalary.toLocaleString()}원 = ${calculatedSalary.toLocaleString()}원`
        };
      }
    }

    res.json({
      success: true,
      contractTitle: contract.title,
      wageType,
      wageAmount,
      totalHours: totalHours.toFixed(2),
      calculatedSalary: Math.round(calculatedSalary),
      calculationDetail,
      entriesCount: entries.length,
      period: year && month ? `${year}년 ${month}월` : "전체 기간"
    });
  } catch (err) {
    console.error("급여 계산 오류:", err);
    res.status(500).json({ error: err.message || "급여 계산 실패" });
  }
});

// ----------------------
// 이력서 PDF 생성
// ----------------------
router.post("/resume/generate-pdf", async (req, res) => {
  try {
    const { name, email, phone, address, careerItems, selfIntroduction } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: "이름과 이메일은 필수입니다." });
    }

    // PDF 생성
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="이력서_${name}.pdf"`);
      res.send(pdfBuffer);
    });

    // 한글 폰트 로드 시도
    try {
      const fontPath = resolve(__dirname, "../fonts/NanumGothic-Regular.ttf");
      if (fs.existsSync(fontPath)) {
        doc.font(fontPath);
      } else {
        doc.font("Helvetica");
      }
    } catch (fontErr) {
      console.warn("폰트 로드 실패, 기본 폰트 사용:", fontErr);
      doc.font("Helvetica");
    }

    // 제목
    doc.fontSize(20).text("이 력 서", { align: "center" });
    doc.moveDown(2);

    // 기본 정보
    doc.fontSize(14).text("기본 정보", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`이름: ${name || ""}`);
    doc.text(`이메일: ${email || ""}`);
    doc.text(`연락처: ${phone || ""}`);
    doc.text(`주소: ${address || ""}`);
    doc.moveDown(1.5);

    // 경력사항
    if (careerItems && careerItems.length > 0) {
      doc.fontSize(14).text("경력사항", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      
      careerItems.forEach((career, index) => {
        doc.text(`경력 ${index + 1}`);
        doc.text(`  회사명/직책: ${career.employerName || ""} ${career.position || ""}`);
        doc.text(`  근무기간: ${career.startDate || ""} ~ ${career.endDate || ""}`);
        doc.moveDown(0.5);
      });
      doc.moveDown(1);
    }

    // 자기소개서
    if (selfIntroduction) {
      doc.fontSize(14).text("자기소개서", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(selfIntroduction, { align: "left" });
    }

    doc.end();
  } catch (e) {
    console.error("이력서 PDF 생성 오류:", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

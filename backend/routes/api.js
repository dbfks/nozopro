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

    // DB에만 저장 (블록체인 X)
    const entry = new TimeEntry({
      contractId: id,
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

    // DB 업데이트 (마지막 출근 기록 찾아서 퇴근 기록 추가)
    const entry = await TimeEntry.findOne({ 
      contractId: id, 
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
    
    // 각 엔트리를 블록체인에 업로드
    for (const entry of entries) {
      try {
        // 출근 트랜잭션
        const inTx = await timesheet.clockIn(contractId);
        await inTx.wait();
        
        // 퇴근 트랜잭션 (퇴근 시간이 있는 경우)
        let outTx = null;
        if (entry.outTime) {
          outTx = await timesheet.clockOut(contractId);
          await outTx.wait();
        }

        // DB 업데이트
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
        // 개별 트랜잭션 실패는 로그만 남기고 계속 진행
      }
    }

    res.json({ 
      success: true, 
      message: `${entries.length}개 기록이 승인되어 블록체인에 등록되었습니다.`,
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

// ----------------------
// 계약 목록 조회 (DB)
// ----------------------
router.get("/contracts", async (req, res) => {
  try {
    const { q, employer, employee, status, from, to, page = 1, size = 10 } = req.query;

    const filter = {};
    if (employer) filter["employer.address"] = employer;
    if (employee) {
      filter["employee.address"] = employee;
      // 근로자 리스트 기본 가시성: ACCEPTED 이후 상태만 노출
      if (!status) {
        filter.status = { $in: [
          "ACCEPTED",
          "PENDING_SIGN",
          "SIGNED_EMP",
          "SIGNED_BOTH",
          "APPROVED",
        ] };
      }
    }
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }

    let query = Contract.find(filter).sort({ createdAt: -1 });
    if (q) query = query.find({ $text: { $search: q } });

    const skip = (Number(page) - 1) * Number(size);
    const [items, total] = await Promise.all([
      query.skip(skip).limit(Number(size)),
      Contract.countDocuments(q ? { ...filter, $text: { $search: q } } : filter),
    ]);

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

export default router;

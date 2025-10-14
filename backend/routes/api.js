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

import { createInvite, acceptInvite } from '../controllers/contractController.js';
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

// ✅ 출근
router.post("/clock-in", async (req, res) => {
  try {
    const { id, walletAddress } = req.body;
    if (!id || !walletAddress) {
      return res.status(400).json({ error: "id와 walletAddress가 필요합니다." });
    }

    // 온체인 출근 트랜잭션 실행 (컨트랙트 시그니처는 clockIn(string) 하나의 인자만 받음)
    const tx = await timesheet.clockIn(id);
    await tx.wait();

    // DB 저장
    const entry = new TimeEntry({
      contractId: id,
      walletAddress,
      inTime: new Date(),
      txHashIn: tx.hash,
    });
    await entry.save();

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error("clock-in error:", err);
    res.status(500).json({ error: err.reason || err.message });
  }
});

// ✅ 퇴근
router.post("/clock-out", async (req, res) => {
  try {
    const { id, walletAddress } = req.body;
    if (!id || !walletAddress) {
      return res.status(400).json({ error: "id와 walletAddress가 필요합니다." });
    }

    // 온체인 퇴근 트랜잭션 실행 (컨트랙트 시그니처는 clockOut(string) 하나의 인자만 받음)
    const tx = await timesheet.clockOut(id);
    await tx.wait();

    // DB 업데이트 (마지막 출근 기록 찾아서 퇴근 기록 추가)
    const entry = await TimeEntry.findOne({ contractId: id, walletAddress }).sort({ createdAt: -1 });
    if (entry) {
      entry.outTime = new Date();
      entry.txHashOut = tx.hash;
      await entry.save();
    }

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error("clock-out error:", err);
    res.status(500).json({ error: err.reason || err.message });
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
    if (employee) filter["employee.address"] = employee;
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

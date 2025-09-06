// backend/routes/api.js
import 'dotenv/config'
import express from 'express';  
import multer from 'multer';
import PinataSDK from '@pinata/sdk';
import streamifier from 'streamifier';
import { ethers } from 'ethers';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import Contract from "../models/Contract.js";
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

/**
 * @route POST /api/uploadContract
 * @desc  계약서 파일을 form-data로 받아 Pinata에 업로드하고 CID 반환
 *        필드명: contract
 */

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

// 온체인 계약 등록 (자동화 안 할 경우 직접 호출용)
router.post('/register', async (req, res) => {
  try {
    const { cid, expiryTs } = req.body;
    const tx = await registry.registerContract(ethers.id(cid), expiryTs);
    const receipt = await tx.wait();
    const nextIdBigInt = await registry.nextId();
    const id = Number(nextIdBigInt - 1n);
    res.json({ txHash: tx.hash, id });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: err.reason || err.message });
  }
});

// 출퇴근 기록
router.post('/clock-in', async (req, res) => {
  const { id } = req.body;
  const tx = await timesheet.clockIn(id);
  await tx.wait();
  res.json({ txHash: tx.hash });
});

router.post('/clock-out', async (req, res) => {
  const { id } = req.body;
  const tx = await timesheet.clockOut(id);
  await tx.wait();
  res.json({ txHash: tx.hash });
});

// 출퇴근 로그 조회
router.get('/entries/:id', async (req, res) => {
  try {
    const agreementId = Number(req.params.id);
    const filterIn  = timesheet.filters.ClockIn(agreementId);
    const filterOut = timesheet.filters.ClockOut(agreementId);

    const logsIn  = await timesheet.queryFilter(filterIn);
    const logsOut = await timesheet.queryFilter(filterOut);

    res.json({
      clockIns:  logsIn.map(l => Number(l.args.time)),
      clockOuts: logsOut.map(l => Number(l.args.time)),
    });
  } catch (err) {
    console.error('entries error', err);
    res.status(500).json({ error: err.reason || err.message || '기록 조회 오류' });
  }
});

// ----------------------
// 계약 목록 조회 (DB)
// ----------------------
router.get("/contracts", async (req, res) => {
  try {
    const {
      q, employer, employee, status, from, to,
      page = 1, size = 10,
    } = req.query;

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
    const approved = await Contract.find({ status: "APPROVED" })
      .sort({ updatedAt: -1 });
    res.json({ items: approved, total: approved.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================== 오프체인 계약 관리 ==================
router.post('/contracts/:id/invite', createInvite);
router.post('/contracts/:id/accept', acceptInvite);
router.post('/contracts/:id/request-otp', requestOtp);
router.post('/contracts/:id/verify-otp', verifyOtp);
router.post('/contracts/:id/sign', signContract);

export default router;

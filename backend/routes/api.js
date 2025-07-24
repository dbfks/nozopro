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

// 3) REST API 라우트

/**
 * @route POST /api/uploadContract
 * @desc  계약서 파일을 form-data로 받아 Pinata에 업로드하고 CID 반환
 *        필드명: contract
 */

router.post(
  '/uploadContract',
  upload.single('contract'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'contract 필드에 파일을 첨부해주세요.' });
      }

      // 버퍼 → 스트림
      const readStream = streamifier.createReadStream(req.file.buffer);

      // Pinata에 핀
      const result = await pinata.pinFileToIPFS(readStream, {
        pinataMetadata: { name: req.file.originalname }
      });

      // CID 응답
      return res.json({ cid: result.IpfsHash });
    } catch (err) {
      console.error('uploadContract error', err);
      return res
        .status(500)
        .json({ error: err.message || '파일 업로드 중 오류가 발생했습니다.' });
    }
  }
);

// 3.1 계약 등록
router.post('/register', async (req, res) => {
  try {
    const { cid, expiryTs } = req.body;
    const tx = await registry.registerContract(ethers.id(cid), expiryTs);
    const receipt = await tx.wait();
    // 1) on-chain 상태 읽기: nextId는 이미 ++ 됐으니, 현재 값에서 1 빼기
     // v6 방식: BigInt 뺄셈 사용
    const nextIdBigInt = await registry.nextId();         // BigInt
    const id = Number(nextIdBigInt - 1n);                  // 바로 직전 할당된 ID       // 실제 방금 생성된 ID
    
    res.json({ txHash: tx.hash, id });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: err.reason || err.message });
  }
});

// 3.2 서명 (고용주 / 근로자)
router.post('/sign/employer', async (req, res) => {
  try { 
    const { id } = req.body;
    const tx = await registry.signByEmployer(id);
    await tx.wait();
    res.json({ txHash: tx.hash });
  } catch (err) {
    console.error('employer sign error', err);
    res
    .status(500)
    .json({ error: err.reason || err.message || 'Unknown error' });
  }
});

router.post('/sign/worker', async (req, res) => {
  try { 
    const { id } = req.body;
    const tx = await registry.signByWorker(id);
    await tx.wait();
    res.json({ txHash: tx.hash });
  } catch (err) {
    console.error('worker sign error', err);
    res
    .status(500)
    .json({ error: err.reason || err.message || 'Unknown error' });
  }
});

//3.3. 최종 승인(approveContract) 엔드포인트 추가
router.post('/approve', async (req, res) => {
  try {
    const { id } = req.body;
    if (typeof id !== 'number' && typeof id !== 'string') {
      return res.status(400).json({ error: 'id(계약번호)를 body에 담아주세요.' });
    }

    const tx = await registry.approveContract(Number(id));
    await tx.wait();

    return res.json({ txHash: tx.hash });
  } catch (err) {
    console.error('approve error', err);
    return res
      .status(500)
      .json({ error: err.reason || err.message || '승인 처리 중 오류가 발생했습니다.' });
  }
});


// 3.4 계약만료 트리거
router.post('/expire', async (req, res) => {
  try {
    const { id } = req.body;
    if (id === undefined) {
      return res.status(400).json({ error: 'id(계약번호)를 body에 담아주세요.' });
    }
    const tx = await registry.expireContract(Number(id));
    await tx.wait();
    return res.json({ txHash: tx.hash });
  } catch (err) {
    console.error('expire error', err);
    // block.timestamp < expiry 시 발생하는 Not yet expired 메시지 등
    return res
      .status(500)
      .json({ error: err.reason || err.message || '만료 처리 중 오류가 발생했습니다.' });
  }
});


// 3.5 출퇴근
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

// 3.6 기록 조회 (예: GET /api/entries/0)
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
    res
      .status(500)
      .json({ error: err.reason || err.message || '기록 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
// backend/app.js  (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ethers } from 'ethers';

// Node 18+ 에선 아래처럼 JSON 모듈을 import 할 수 있습니다.
import registryArtifact from '../artifacts/contracts/ContractRegistry.sol/ContractRegistry.json' assert { type: 'json' };
import timesheetArtifact from '../artifacts/contracts/TimeSheet.sol/TimeSheet.json' assert { type: 'json' };

const registryAbi  = registryArtifact.abi;
const timesheetAbi = timesheetArtifact.abi;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const registry  = new ethers.Contract(process.env.CONTRACT_ADDRESS, registryAbi, wallet);
const timesheet = new ethers.Contract(process.env.TIMESHEET_ADDRESS, timesheetAbi, wallet);

// 3) REST API 라우트
// 3.1 계약 등록
app.post('/api/register', async (req, res) => {
  const { cid, expiryTs } = req.body;
  const tx = await registry.registerContract(ethers.id(cid), expiryTs);
  await tx.wait();
  res.json({ txHash: tx.hash });
});

// 3.2 서명 (고용주 / 근로자)
app.post('/api/sign/employer', async (req, res) => {
  const { id } = req.body;
  const tx = await registry.signByEmployer(id);
  await tx.wait();
  res.json({ txHash: tx.hash });
});
app.post('/api/sign/worker', async (req, res) => {
  const { id } = req.body;
  const tx = await registry.signByWorker(id);
  await tx.wait();
  res.json({ txHash: tx.hash });
});

// 3.3 출퇴근
app.post('/api/clock-in', async (req, res) => {
  const { id } = req.body;
  const tx = await timesheet.clockIn(id);
  await tx.wait();
  res.json({ txHash: tx.hash });
});
app.post('/api/clock-out', async (req, res) => {
  const { id } = req.body;
  const tx = await timesheet.clockOut(id);
  await tx.wait();
  res.json({ txHash: tx.hash });
});

// 3.4 기록 조회 (예: GET /api/entries/0)
app.get('/api/entries/:id', async (req, res) => {
  const agreementId = Number(req.params.id);
  const filterIn  = timesheet.filters.ClockIn(agreementId);
  const filterOut = timesheet.filters.ClockOut(agreementId);

  const logsIn  = await timesheet.queryFilter(filterIn);
  const logsOut = await timesheet.queryFilter(filterOut);
  res.json({
    clockIns:  logsIn.map(l => l.args.time.toNumber()),
    clockOuts: logsOut.map(l => l.args.time.toNumber()),
  });
});

app.listen(process.env.PORT||3001, () => {
  console.log('API running on http://localhost:' + (process.env.PORT||3001));
});

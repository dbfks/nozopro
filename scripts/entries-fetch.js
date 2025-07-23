// 예시: entries-fetch.js
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const ts       = await ethers.getContractAt(
    'TimeSheet',
    process.env.TIMESHEET_ADDRESS,
    provider
  );

  const agreementId = 0;
  const logsIn  = await ts.queryFilter(ts.filters.ClockIn(agreementId));
  const logsOut = await ts.queryFilter(ts.filters.ClockOut(agreementId));

  console.log('▶ ClockIn logs:', logsIn.map(l => l.args.time.toString()));
  console.log('▶ ClockOut logs:', logsOut.map(l => l.args.time.toString()));
}

main().catch(console.error);

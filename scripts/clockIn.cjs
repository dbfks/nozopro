// scripts/clockIn.cjs
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const [ signer ] = await ethers.getSigners();
  const ts = await ethers.getContractAt(
    'TimeSheet',
    process.env.TIMESHEET_ADDRESS,
    signer
  );

  const agreementId = 0;     // 기존에 만든 계약 ID
  const tx = await ts.clockIn(agreementId);
  console.log('⏰ clockIn tx:', tx.hash);
  await tx.wait();
}

main().catch(e=>{
  console.error(e);
  process.exit(1);
});

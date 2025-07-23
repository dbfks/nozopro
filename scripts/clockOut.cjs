// scripts/clockOut.cjs
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const [ signer ] = await ethers.getSigners();
  const ts = await ethers.getContractAt(
    'TimeSheet',
    process.env.TIMESHEET_ADDRESS,
    signer
  );

  const agreementId = 0;
  const tx = await ts.clockOut(agreementId);
  console.log('🛑 clockOut tx:', tx.hash);
  await tx.wait();
}

main().catch(e=>{
  console.error(e);
  process.exit(1);
});

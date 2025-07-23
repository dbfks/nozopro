// scripts/triggerExpire.js
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const registry = await ethers.getContractAt(
    'ContractRegistry',
    process.env.CONTRACT_ADDRESS
  );
  const id = 0;
  const tx = await registry.expireContract(id);
  console.log('만료 트리거 tx:', tx.hash);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

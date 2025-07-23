// scripts/registerPast.cjs
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const [signer] = await ethers.getSigners();
  const registry = await ethers.getContractAt(
    'ContractRegistry',
    process.env.CONTRACT_ADDRESS,
    signer
  );

  const cid      = process.env.CONTRACT_CID;
  // 10초 전으로 expiryTs 설정 → 즉시 만료 가능
  const expiryTs = Math.floor(Date.now()/1000) - 10;

  const tx = await registry.registerContract(ethers.id(cid), expiryTs);
  console.log('과거 만료로 등록 tx:', tx.hash);
  await tx.wait();
  console.log('등록된 ID:', 1);  // 0번 뒤라면 1번일 겁니다.
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

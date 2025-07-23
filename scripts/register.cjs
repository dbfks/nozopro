// scripts/register.js
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  // 1) 서명자 가져오기
  const [signer] = await ethers.getSigners();

  // 2) 이미 배포된 ContractRegistry 인스턴스 불러오기
  const registry = await ethers.getContractAt(
    'ContractRegistry',
    process.env.CONTRACT_ADDRESS,
    signer
  );
  const cid      = process.env.CONTRACT_CID;
  const expiry  = Math.floor(Date.now()/1000) + 3600;

  // 1) 등록
  let tx = await registry.registerContract(ethers.id(cid), expiry);
  console.log('등록 tx:', tx.hash);
  await tx.wait();

  const id = 0; // 첫 번째

  // 2) 고용주 서명
  tx = await registry.signByEmployer(id);
  console.log('Employer 서명 tx:', tx.hash);
  await tx.wait();

  // 3) 근로자 서명
  tx = await registry.signByWorker(id);
  console.log('Worker 서명 tx:', tx.hash);
  await tx.wait();

  // 4) 최종 승인
  tx = await registry.approveContract(id);
  console.log('승인 tx:', tx.hash);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

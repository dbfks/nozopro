import { ethers } from "ethers";

const ABI = [
  "function registerContract(string id, bytes32 fileHash, uint256 expiry) external",
  "function signByEmployer(string id) external",
  "function signByWorker(string id) external",
  "function approveContract(string id) external",
  "function contracts(string id) view returns (bytes32 fileHash,uint256 expiry,bool signedByEmployer,bool signedByWorker,bool approved)"
];

// 📌 provider & wallet 생성
function getContract() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);
}

// PDF 버퍼 → keccak256 해시 (bytes32)
export function keccak256(buf) {
  return ethers.keccak256(buf); // "0x..." 형태 반환
}

// 계약 등록 (DB의 contractId 그대로 온체인 등록)
export async function registerOnChain(contractId, fileHash, expiryTs) {
  const contract = getContract();
  const tx = await contract.registerContract(contractId, fileHash, expiryTs);
  await tx.wait();
  return { txHash: tx.hash, contractId };
}

// 고용주 서명
export async function signByEmployer(contractId) {
  const contract = getContract();
  const tx = await contract.signByEmployer(contractId);
  await tx.wait();
  return tx.hash;
}

// 근로자 서명
export async function signByWorker(contractId) {
  const contract = getContract();
  const tx = await contract.signByWorker(contractId);
  await tx.wait();
  return tx.hash;
}

// 최종 승인
export async function approveOnChain(contractId) {
  const contract = getContract();
  const tx = await contract.approveContract(contractId);
  await tx.wait();
  return tx.hash;
}

// 상태 조회
export async function getContractState(contractId) {
  const contract = getContract();
  const data = await contract.contracts(contractId);
  return {
    fileHash: data.fileHash,
    expiry: Number(data.expiry),
    signedByEmployer: data.signedByEmployer,
    signedByWorker: data.signedByWorker,
    approved: data.approved,
  };
}

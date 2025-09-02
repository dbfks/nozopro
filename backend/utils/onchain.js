import { ethers } from "ethers";

const ABI = [
  "function registerContract(bytes32 fileHash, uint256 expiry) external",
  "function signByEmployer(uint256 id) external",
  "function signByWorker(uint256 id) external",
  "function approveContract(uint256 id) external",
  "function contracts(uint256 id) view returns (bytes32 fileHash,uint256 expiry,bool signedByEmployer,bool signedByWorker,bool approved)",
  "function nextId() view returns (uint256)"
];

// 📌 provider & wallet 생성 (매번 불러쓸 수 있게 함수로)
function getContract() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);
}

// PDF 버퍼 → keccak256 해시 (bytes32)
export function keccak256(buf) {
  return ethers.keccak256(buf); // "0x..." 형태로 반환
}

// 계약 등록 (최종 PDF 해시 + 만료시각)
export async function registerOnChain(fileHash, expiryTs) {
  const contract = getContract();
  const tx = await contract.registerContract(fileHash, expiryTs);
  await tx.wait();

  // nextId는 이미 증가했으므로 현재 계약 ID는 nextId - 1
  const nextId = await contract.nextId();
  return {
    txHash: tx.hash,
    contractId: Number(nextId) - 1,
  };
}

// 고용주 서명
export async function signByEmployer(id) {
  const contract = getContract();
  const tx = await contract.signByEmployer(id);
  await tx.wait();
  return tx.hash;
}

// 근로자 서명
export async function signByWorker(id) {
  const contract = getContract();
  const tx = await contract.signByWorker(id);
  await tx.wait();
  return tx.hash;
}

// 최종 승인
export async function approveOnChain(id) {
  const contract = getContract();
  const tx = await contract.approveContract(id);
  await tx.wait();
  return tx.hash;
}

// 상태 조회
export async function getContractState(id) {
  const contract = getContract();
  const data = await contract.contracts(id);
  return {
    fileHash: data.fileHash,
    expiry: Number(data.expiry),
    signedByEmployer: data.signedByEmployer,
    signedByWorker: data.signedByWorker,
    approved: data.approved,
  };
}

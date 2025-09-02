// node backend/scripts/test_utils.js
import 'dotenv/config';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildContractPdf } from "../utils/pdf.js";
import { pinFileToIPFS } from "../utils/pinata.js";
import { keccak256, registerOnChain } from "../utils/onchain.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assertEnv(name) {
  if (!process.env[name] || String(process.env[name]).trim() === "") {
    throw new Error(`.env에 ${name}가 없습니다`);
  }
}

async function main() {
  console.log("✅ test_utils start");

  // 0) ENV 체크
  ["PINATA_API_KEY", "PINATA_API_SECRET", "RPC_URL", "PRIVATE_KEY", "CONTRACT_ADDRESS"].forEach(assertEnv);

  // 1) 더미 계약/서명 데이터
  const contract = {
    contractId: `demo-${Date.now()}`,
    title: "전자서명 테스트 계약",
    employer: { address: "0xE1", name: "Acme HR" },
    employee: { address: "0xE2", name: "홍길동" },
    docJson: { role: "파트타임", hoursPerWeek: 20, startDate: "2025-09-01" },
  };
  const employeeSign = { signType: "AUTO", signBlob: null };
  const employerSign = { signType: "AUTO", signBlob: null };

  // 2) PDF 생성
  console.time("PDF");
  const pdf = await buildContractPdf({ contract, employeeSign, employerSign });
  console.timeEnd("PDF");
  const outPath = path.resolve(__dirname, `./out_${contract.contractId}.pdf`);
  fs.writeFileSync(outPath, pdf);
  console.log("📄 PDF saved:", outPath, `(${pdf.length} bytes)`);

  // 3) Pinata 업로드
  console.time("Pinata");
  const cid = await pinFileToIPFS(`${contract.contractId}.pdf`, pdf);
  console.timeEnd("Pinata");
  console.log("📦 IPFS CID:", cid);

  // 4) keccak256 해시
  const finalDocHash = keccak256(pdf);
  console.log("🔒 finalDocHash(bytes32):", finalDocHash);

  // 5) 온체인 등록 (만료: 30일 뒤)
  const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  console.time("OnChain");
  const { txHash, contractId } = await registerOnChain(finalDocHash, expiry);
  console.timeEnd("OnChain");
  console.log("⛓️  txHash:", txHash);
  console.log("🆔 on-chain id:", contractId);

  console.log("✅ all done");
}

main().catch((e) => {
  console.error("❌ test_utils failed:", e);
  process.exit(1);
});

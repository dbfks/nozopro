import Contract from "../models/Contract.js";
import mongoose from "mongoose";
import { buildContractPdf } from "../utils/pdf.js";
import { pinFileToIPFS } from "../utils/pinata.js";
import { keccak256 } from "../utils/onchain.js";
import { ethers } from "ethers";
import fs from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ABI & provider
const registryJsonPath  = resolve(
  __dirname,
  "../../artifacts/contracts/ContractRegistry.sol/ContractRegistry.json"
);
const registryArtifact  = JSON.parse(fs.readFileSync(registryJsonPath, "utf8"));
const registryAbi       = registryArtifact.abi;

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const registry = new ethers.Contract(process.env.CONTRACT_ADDRESS, registryAbi, wallet);

const { isValidObjectId } = mongoose;

async function findContract(id) {
  if (isValidObjectId(id)) {
    const doc = await Contract.findById(id);
    if (doc) return doc;
  }
  return await Contract.findOne({ contractId: id });
}

export async function signContract(req, res) {
  try {
    const { id } = req.params;
    const { inviteId, signer, sig, signType, signBlob } = req.body;

    const contract = await findContract(id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const invite = contract.invites.find((v) => v.id === inviteId);
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    // ---------------- 직원 서명 ----------------
    if (signer.toLowerCase() === contract.employee.address.toLowerCase()) {
      if (contract.status !== "ACCEPTED")
        return res.status(400).json({ error: "Invalid state for employee sign" });
      if (!invite.otpVerified)
        return res.status(400).json({ error: "OTP not verified" });

      // DB에 직원 서명 저장
      contract.signatures.push({
        by: signer,
        role: "EMPLOYEE",
        sig: signType === "WALLET" ? sig : "",
        signType: signType || "DRAWN",
        signBlob: signType === "DRAWN" ? signBlob : "",
        at: new Date(),
      });
      contract.status = "SIGNED_EMP";

      // 계약 JSON 자체를 IPFS에 업로드
      const docBuffer = Buffer.from(JSON.stringify(contract.docJson, null, 2));
      const cid = await pinFileToIPFS(`${contract.contractId}.json`, docBuffer);

      // 해시 계산
      const finalDocHash = keccak256(docBuffer);

      // 온체인 등록 (registerContract)
      const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const tx = await registry.registerContract(finalDocHash, expiry);
      await tx.wait();

      const nextIdBig = await registry.nextId();
      const onChainId = Number(nextIdBig - 1n);

      // DB 업데이트
      contract.onChain = { id: onChainId, lastTxHash: tx.hash };
      await contract.save();

      return res.json({
        ok: true,
        status: contract.status,
        onChainId,
        ipfsCid: cid,
        txHash: tx.hash,
      });
    }

    // ---------------- 고용주 서명 ----------------
else if (signer.toLowerCase() === contract.employer.address.toLowerCase()) {
    if (contract.status !== "SIGNED_EMP")
      return res.status(400).json({ error: "Invalid state for employer sign" });
  
    // ✅ 최신 EMPLOYEE 서명만 사용
    const employeeSign = contract.signatures
      .filter((s) => s.role === "EMPLOYEE")
      .sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  
    const employerSign = {
      by: signer,
      role: "EMPLOYER",
      sig: signType === "WALLET" ? sig : "",
      signType: signType || "DRAWN",
      signBlob: signType === "DRAWN" ? signBlob : "",
      at: new Date(),
    };
  
    contract.signatures.push(employerSign);
    contract.status = "APPROVED";
  
    // PDF 생성
    const pdf = await buildContractPdf({ contract, employeeSign, employerSign });
  
    // 해시 계산
    const finalDocHash = keccak256(pdf);
  
    // IPFS 업로드
    const cid = await pinFileToIPFS(`${contract.contractId}.pdf`, pdf);
  
    // 온체인 승인
    const onChainId = Number(contract.onChain?.id);
    if (isNaN(onChainId)) {
      return res.status(500).json({ error: "On-chain ID not found. Did you run employee sign first?" });
    }
    // 1) 고용주 온체인 서명
    const tx1 = await registry.signByEmployer(onChainId);
    await tx1.wait();

    // 2) 근로자도 이미 DB에서 SIGNED_EMP 상태라면, on-chain에도 worker 서명 반영 필요
    const tx2 = await registry.signByWorker(onChainId);
    await tx2.wait();

    // 3) 이제 최종 승인
    const tx3 = await registry.approveContract(onChainId);
    await tx3.wait();

  
    // DB 최종 업데이트
    contract.final = {
        pdfUrl: cid,
        sha256: finalDocHash,
        ipfsCid: cid,
        txHash: tx3.hash,   // ✅ approveContract 트랜잭션 해시 저장
    };
    await contract.save();
  
    return res.json({
      ok: true,
      status: contract.status,
      final: contract.final,
    });
  }
  

    else {
      return res.status(400).json({ error: "Signer not authorized" });
    }
  } catch (e) {
    console.error("signContract error:", e);
    res.status(500).json({ error: e.message });
  }
}

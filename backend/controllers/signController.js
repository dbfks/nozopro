// backend/controllers/signController.js
import Contract from "../models/Contract.js";
import mongoose from "mongoose";
import { buildContractPdf } from "../utils/pdf.js";
import { pinFileToIPFS } from "../utils/pinata.js";
import { keccak256, registerOnChain, approveOnChain } from "../utils/onchain.js";

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

    // ---------------- 직원 서명 ----------------
    if (signer.toLowerCase() === contract.employee.address.toLowerCase()) {
      if (contract.status !== "ACCEPTED")
        return res.status(400).json({ error: "Invalid state for employee sign" });

      // 중복 서명 방지
      if (contract.signatures.some(s => s.role === "EMPLOYEE")) {
        return res.status(400).json({ error: "Employee already signed" });
      }

      contract.signatures.push({
        by: signer,
        role: "EMPLOYEE",
        sig: signType === "WALLET" ? sig : "",
        signType: signType || "DRAWN",
        signBlob: signType === "DRAWN" ? signBlob : "",
        at: new Date(),
      });

      contract.status = "SIGNED_EMP";
      await contract.save();

      return res.json({ ok: true, status: contract.status });
    }

    // ---------------- 고용주 서명 + 최종 승인 ----------------
    if (signer.toLowerCase() === contract.employer.address.toLowerCase()) {
      if (contract.status !== "SIGNED_EMP")
        return res.status(400).json({ error: "Invalid state for employer sign" });

      // 중복 서명 방지
      if (contract.signatures.some(s => s.role === "EMPLOYER")) {
        return res.status(400).json({ error: "Employer already signed" });
      }

      // 고용주 서명 추가
      contract.signatures.push({
        by: signer,
        role: "EMPLOYER",
        sig: signType === "WALLET" ? sig : "",
        signType: signType || "DRAWN",
        signBlob: signType === "DRAWN" ? signBlob : "",
        at: new Date(),
      });

      // ===== PDF 생성 & IPFS 업로드 =====
      const employeeSign = contract.signatures.find(s => s.role === "EMPLOYEE");
      const employerSign = contract.signatures.find(s => s.role === "EMPLOYER");
      const pdfBuffer = await buildContractPdf({
        contract: contract.toObject(),
        employeeSign,
        employerSign,
      });

      const cid = await pinFileToIPFS(`${contract.contractId}.pdf`, pdfBuffer);
      const fileHash = keccak256(pdfBuffer);

      // ===== 온체인 등록 / 승인 =====
      let txHash = null;
      if (!contract.onChain?.id) {
        // 최초 등록
        const expiryTs = Math.floor(new Date(contract.docJson?.contractPeriod?.endDate || Date.now()) / 1000);
        const { txHash: regHash, contractId: chainId } = await registerOnChain(fileHash, expiryTs);
        contract.onChain = { id: chainId, txHash: regHash };
        txHash = regHash;
      } else {
        // 이미 등록된 경우 → 최종 승인
        txHash = await approveOnChain(contract.onChain.id);
      }

      // ===== DB 갱신 =====
      contract.status = "APPROVED";
      contract.final = {
        pdfUrl: `ipfs://${cid}`,
        ipfsCid: cid,
        sha256: fileHash,
        txHash,
      };
      await contract.save();

      return res.json({ ok: true, status: contract.status, final: contract.final });
    }

    return res.status(400).json({ error: "Signer not authorized" });
  } catch (e) {
    console.error("signContract error:", e);
    res.status(500).json({ error: e.message });
  }
}

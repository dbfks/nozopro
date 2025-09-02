import { Router } from "express";
import mongoose from "mongoose";
import Contract from "../models/Contract.js";
import Invitation from "../models/Invitation.js";
import Signature from "../models/Signature.js";
import { buildContractPdf } from "../utils/pdf.js";
import { pinFileToIPFS } from "../utils/pinata.js";
import { keccak256, registerOnChain, signByEmployer, signByWorker, approveOnChain } from "../utils/onchain.js";
import crypto from "crypto";

const router = Router();

// 요청 로거
router.use((req, _res, next) => {
  console.log("[contract-flow]", req.method, req.originalUrl, req.body || req.query);
  next();
});

/**
 * 1) 근로자 초대 발송
 * POST /api/contracts/:id/invite
 */
router.post("/:id/invite", async (req, res) => {
  try {
    const id = String(req.params.id);
    const contract = await Contract.findOne({ $or: [{ contractId: id }, mongoose.Types.ObjectId.isValid(id) ? { _id: id } : null].filter(Boolean) });
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const token = crypto.randomBytes(20).toString("hex");
    const invitation = await Invitation.create({
      contractId: contract.contractId,
      email: req.body.email,
      inviteeAddress: req.body.inviteeAddress,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30분 유효
    });

    // 개발 모드: 콘솔에 초대 링크 출력
    const link = `${process.env.APP_ORIGIN || "http://localhost:5000"}/accept?token=${token}`;
    console.log("📧 Invitation link:", link);

    contract.status = "SENT";
    await contract.save();

    res.json({ ok: true, token, link });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 2) 초대 토큰으로 계약서 미리보기
 * GET /api/contracts/accept?token=...
 */
router.get("/accept", async (req, res) => {
  try {
    const token = req.query.token;
    const invitation = await Invitation.findOne({ token, usedAt: null, expiresAt: { $gte: new Date() } });
    if (!invitation) return res.status(400).json({ error: "Invalid or expired token" });

    const contract = await Contract.findOne({ contractId: invitation.contractId });
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    res.json({ contract, invitation });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 3) 전자서명 제출 (근로자/고용주)
 * POST /api/contracts/:id/sign
 */
router.post("/:id/sign", async (req, res) => {
  try {
    const id = String(req.params.id);
    const { signerAddress, signType, signBlob, token } = req.body;

    const contract = await Contract.findOne({ $or: [{ contractId: id }, mongoose.Types.ObjectId.isValid(id) ? { _id: id } : null].filter(Boolean) });
    if (!contract) return res.status(404).json({ error: "Not found" });

    // ✅ 서명 기록 저장
    await Signature.create({
      contractId: contract.contractId,
      signerAddress,
      signType,
      signBlob,
    });

    // 근로자 서명
    if (signerAddress === contract.employee?.address) {
      if (contract.status !== "SENT" && contract.status !== "DRAFT")
        return res.status(400).json({ error: "Invalid state for employee sign" });

      contract.status = "SIGNED_EMP";
      contract.timeline.push({ action: "SIGNED_EMP", by: signerAddress });
    }

    // 고용주 서명 → 최종 승인
    if (signerAddress === contract.employer?.address) {
      if (contract.status !== "SIGNED_EMP")
        return res.status(400).json({ error: "Invalid state for employer sign" });

      contract.status = "APPROVED";
      contract.timeline.push({ action: "APPROVED", by: signerAddress });

      // 🔥 최종 확정: PDF → IPFS → 온체인
      const empSign = await Signature.findOne({ contractId: contract.contractId, signerAddress: contract.employee?.address }).sort({ createdAt: -1 });
      const bossSign = { signerAddress, signType, signBlob };

      // 1) PDF 생성
      const pdf = await buildContractPdf({ contract, employeeSign: empSign, employerSign: bossSign });

      // 2) PDF 해시
      const finalDocHash = keccak256(pdf);

      // 3) IPFS 업로드
      const cid = await pinFileToIPFS(`${contract.contractId}.pdf`, pdf);

      // 4) 온체인 기록 (만료일: 지금부터 30일 뒤)
      const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const { txHash, contractId: onChainId } = await registerOnChain(finalDocHash, expiry);

      // 5) DB 업데이트
      contract.finalDocHash = finalDocHash;
      contract.ipfsCid = cid;
      contract.onChain = {
        ...(contract.onChain || {}),
        lastTxHash: txHash,
        id: onChainId,
      };
    }

    await contract.save();
    res.json(contract);
  } catch (e) {
    console.error("sign error:", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

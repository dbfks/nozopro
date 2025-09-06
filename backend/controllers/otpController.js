import Contract from "../models/Contract.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { isValidObjectId } = mongoose;

async function findContract(id) {
  if (isValidObjectId(id)) {
    const doc = await Contract.findById(id);
    if (doc) return doc;
  }
  return await Contract.findOne({ contractId: id });
}

// 1) OTP 요청
export async function requestOtp(req, res) {
  try {
    const { id } = req.params;
    const { inviteId, channel = "email" } = req.body;

    const contract = await findContract(id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const invite = contract.invites.find(v => v.id === inviteId);
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    // OTP 생성 (6자리 숫자)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    invite.otpHash = await bcrypt.hash(otp, 10);
    invite.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분
    invite.otpVerified = false;

    await contract.save();

    console.log(`🔑 OTP for ${channel}: ${otp}`); // TODO: 실제 SMS/Email 전송

    res.json({ ok: true, channel, expiresAt: invite.otpExpiresAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// 2) OTP 검증
export async function verifyOtp(req, res) {
  try {
    const { id } = req.params;
    const { inviteId, otp } = req.body;

    const contract = await findContract(id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const invite = contract.invites.find(v => v.id === inviteId);
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    if (!invite.otpHash || !invite.otpExpiresAt) {
      return res.status(400).json({ error: "OTP not requested" });
    }
    if (new Date() > new Date(invite.otpExpiresAt)) {
      return res.status(400).json({ error: "OTP expired" });
    }

    const valid = await bcrypt.compare(otp, invite.otpHash);
    if (!valid) return res.status(400).json({ error: "Invalid OTP" });

    invite.otpVerified = true;
    await contract.save();

    res.json({ ok: true, inviteId, verified: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

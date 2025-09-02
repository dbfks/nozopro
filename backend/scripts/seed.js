import "dotenv/config.js";
import mongoose from "mongoose";
import Contract from "../models/Contract.js";
import User from "../models/User.js";
import Signature from "../models/Signature.js";
import Invitation from "../models/Invitation.js";
import AuditLog from "../models/AuditLog.js";

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/labor";
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "labor" });
  console.log("✅ connected");

  await Promise.all([Contract.deleteMany({}), User.deleteMany({}), Signature.deleteMany({}), Invitation.deleteMany({}), AuditLog.deleteMany({})]);

  const [emp, worker] = await User.create([
    { name: "Acme HR", email: "hr@acme.com", role: "EMPLOYER", walletAddress: "0xE1" },
    { name: "홍길동",   email: "hong@ex.com", role: "EMPLOYEE", walletAddress: "0xE2" },
  ]);

  const base = {
    title: "표준 근로 계약",
    employer: { address: emp.walletAddress, name: emp.name },
    employee: { address: worker.walletAddress, name: worker.name },
    docJson: { position: "파트타임", hoursPerWeek: 20 },
    docHash: "0xdeadbeef",
  };

  await Contract.create([
    { ...base, contractId: "c-draft-1", status: "DRAFT" },
    { ...base, contractId: "c-signed-1", status: "SIGNED_EMP", timeline: [{ by: "0xE2", action: "SIGNED_EMP" }] },
    { ...base, contractId: "c-approved-1", status: "APPROVED", ipfsCid: "", finalDocHash: "0xhash", timeline: [{ by: "0xE1", action: "APPROVED" }] },
  ]);

  console.log("🌱 seeded");
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, index: true },
  userId: String,
  targetId: String,
  detail: mongoose.Schema.Types.Mixed,
  ip: String,
  ua: String,
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });
const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;

import mongoose from "mongoose";

const TimeEntrySchema = new mongoose.Schema({
  contractId: { type: String, required: true },  // 계약 ID
  walletAddress: { type: String, required: true }, // 근로자 지갑주소
  inTime: { type: Date },
  outTime: { type: Date },
  txHashIn: { type: String },
  txHashOut: { type: String },
}, { timestamps: true });

export default mongoose.model("TimeEntry", TimeEntrySchema);
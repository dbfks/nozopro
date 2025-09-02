import mongoose from "mongoose";

const SignatureSchema = new mongoose.Schema({
  contractId: { type: String, required: true, index: true },
  signerAddress: { type: String, required: true, index: true },
  signType: { type: String, enum: ["DRAWN", "AUTO"], required: true },
  signBlob: mongoose.Schema.Types.Mixed,  // dataURL or {cid:...}
  signHash: String,
  meta: { ip: String, ua: String },
  signedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Signature = mongoose.models.Signature || mongoose.model("Signature", SignatureSchema);

export default Signature;

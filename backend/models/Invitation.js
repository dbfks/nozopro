import mongoose from "mongoose";

const InvitationSchema = new mongoose.Schema({
  contractId: { type: String, required: true, index: true },
  inviteeAddress: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: Date,
}, { timestamps: true });

const Invitation = mongoose.models.Invitation || mongoose.model("Invitation", InvitationSchema);

export default Invitation;

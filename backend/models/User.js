import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ["EMPLOYER", "WORKER"], 
    required: true 
  }, // 고용주/근로자
}, { timestamps: true });

export default mongoose.model("User", UserSchema);

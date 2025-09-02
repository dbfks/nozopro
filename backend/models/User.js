import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, index: true },
  phone: String,
  role: { type: String, enum: ["EMPLOYER", "EMPLOYEE"], required: true, index: true },
  walletAddress: { type: String, index: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;

// backend/db.js
import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI; // ex) mongodb://localhost:27017/labor
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "labor" });
  console.log("✅ MongoDB connected");
}

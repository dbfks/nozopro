// backend/models/Contract.js
import mongoose from "mongoose";

function genContractId() {
  // 사람이 읽기 쉬운, 중복 적은 ID
  return (
    "c-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

const ContractSchema = new mongoose.Schema(
  {
    contractId: {
      type: String,
      unique: true,
      required: false,          // ⬅️ 필수 해제
      default: genContractId,   // ⬅️ 자동 생성
      index: true,
    },
    title: { type: String, required: true },

    employer: {
      address: { type: String, required: true },
      name: { type: String },
    },
    employee: {
      address: { type: String, required: true },
      name: { type: String },
    },

    docJson: { type: Object, default: {} },

    // 초안 단계에서는 아직 미확정이므로 비필수
    docHash: { type: String, required: false, default: "" },

    // 최종 승인 시 채우는 필드들
    finalDocHash: { type: String, default: "" },
    ipfsCid: { type: String, default: "" },
    onChain: {
      lastTxHash: { type: String },
      id: { type: Number },
    },

    status: {
      type: String,
      enum: ["DRAFT", "SENT", "SIGNED_EMP", "APPROVED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },

    timeline: [
      {
        action: String,
        by: String,
        txHash: String,
        note: String,
        at: { type: Date, default: Date.now },
      },
    ],

    attachments: [{ name: String, url: String }],
  },
  { timestamps: true }
);

// 검색 인덱스들(있으면 유지)
ContractSchema.index({ "employer.address": 1, status: 1, createdAt: -1 });
ContractSchema.index({ "employee.address": 1, status: 1, createdAt: -1 });
ContractSchema.index({ title: "text" });

const Contract = mongoose.model("Contract", ContractSchema);
export default Contract;

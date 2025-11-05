// backend/models/Contract.js
import mongoose from 'mongoose';
import { createHash, randomBytes, randomUUID } from 'crypto';


// 보조 함수: SHA-256(hex)
export function sha256Hex(input) {
return createHash('sha256').update(input).digest('hex');
}

// 초대(Invite) 하위 스키마
const InviteSchema = new mongoose.Schema(
  {
  id: { type: String, default: () => randomUUID() },
  invitee: {
    address: { type: String, required: true },
    name: { type: String, default: '' },
  },
  role: { type: String, enum: ['EMPLOYER', 'EMPLOYEE'], default: 'EMPLOYEE' },
  expiresAt: { type: Date },
  nonce: { type: String, default: () => randomBytes(16).toString('hex') },
  inviteHash: { type: String },
  acceptedAt: { type: Date },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'EXPIRED'], default: 'PENDING' },
  
  otpHash: { type: String, default: "" },
  otpExpiresAt: { type: Date },
  otpVerified: { type: Boolean, default: false },
  },
  { _id: false },
  );

  // 서명(Signature) 하위 스키마(다음 단계에서 사용)
const SignatureSchema = new mongoose.Schema(
  {
    by: { type: String, required: true }, // signer address
    role: { type: String, enum: ["EMPLOYER", "EMPLOYEE"], required: true },
    sig: { type: String, default: "" },   // ✅ required 제거, 기본값 ""
    signType: { type: String, enum: ["TEXT", "DRAWN", "WALLET"], default: "DRAWN" },
    signBlob: { type: String, default: "" },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

  const ContractSchema = new mongoose.Schema(
    {
    title: { type: String, required: true },
    employer: {
    address: { type: String, required: true },
    name: { type: String, default: '' },
    },
    employee: {
    address: { type: String, required: true },
    name: { type: String, default: '' },
    },
    docJson: { type: mongoose.Schema.Types.Mixed, default: {} },
    
    
    // DRAFT 단계에선 필수 아님 — 기본값으로 자동 채움
    contractId: { type: String, default: () => randomUUID() },
    docHash: { type: String, default: '' },
    
    
    // 상태 머신
    status: {
    type: String,
    enum: ['DRAFT', 'INVITED', 'ACCEPTED', "PENDING_SIGN", 'SIGNED_EMP', 'SIGNED_BOTH', 'APPROVED'],
    default: 'DRAFT',
    },
    
    
    invites: { type: [InviteSchema], default: [] },
    signatures: { type: [SignatureSchema], default: [] },
    
    
    final: {
      pdfUrl: { type: String, default: '' },
      sha256: { type: String, default: '' }, // 최종 PDF 해시
      ipfsCid: { type: String, default: '' },
      txHash: { type: String, default: '' },
      },

      onChain: {
        id: { type: String },
        lastTxHash: { type: String, default: '' },
      },
      
      // 숨김 관리: 각 사용자별로 숨김 상태 저장
      hiddenBy: [{
        address: { type: String, required: true },
        role: { type: String, enum: ['EMPLOYER', 'EMPLOYEE'], required: true },
        hiddenAt: { type: Date, default: () => new Date() }
      }],
      
      // 사용자별 커스텀 이름: 각 사용자가 자신이 보는 계약 이름을 독립적으로 설정
      customNames: [{
        address: { type: String, required: true },
        role: { type: String, enum: ['EMPLOYER', 'EMPLOYEE'], required: true },
        customName: { type: String, required: true },
        updatedAt: { type: Date, default: () => new Date() }
      }],
    },
    { timestamps: true }
    );

    // 초대용 해시 계산기: 계약ID|주소|역할|nonce|만료시각(ISO)
export function computeInviteHash({ contractId, invitee, role, nonce, expiresAt }) {
  const iso = expiresAt ? new Date(expiresAt).toISOString() : '';
  const msg = `${contractId}|${invitee.address.toLowerCase()}|${role}|${nonce}|${iso}`;
  return sha256Hex(msg);
  }
  
  
  export default mongoose.model('Contract', ContractSchema);
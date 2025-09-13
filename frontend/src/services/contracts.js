const API = "/api";

// 계약 생성
export async function createContract(body) {
  const r = await fetch(`/api/contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // 응답 JSON 항상 파싱
  const data = await r.json();

  // 에러일 경우 실제 에러 메시지 던지기
  if (!r.ok) {
    throw new Error(data.error || "계약 생성 실패");
  }
  return data;
}

/**
 * 계약 목록 조회
 */
export async function listContracts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${API}/contracts${qs ? `?${qs}` : ""}`);
  if (!r.ok) throw new Error("계약 목록 조회 실패");
  return r.json();
}

/**
 * 계약 단건 조회
 */
export async function getContract(id) {
  const r = await fetch(`${API}/contracts/${id}`);
  if (!r.ok) throw new Error("계약 조회 실패");
  return r.json();
}

/**
 * 계약 수정 (DRAFT/SENT 상태만 가능)
 */
export async function updateContract(id, body) {
  const r = await fetch(`${API}/contracts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("계약 수정 실패");
  return r.json();
}

/**
 * 초대 발송
 */
export async function inviteContract(id, body) {
  const r = await fetch(`${API}/contracts/${id}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("계약 초대 실패");
  return r.json();
}

/**
 * 초대 수락
 */
export async function acceptContract(id, body) {
  const r = await fetch(`${API}/contracts/${id}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("계약 수락 실패");
  return r.json();
}

/**
 * OTP 요청
 */
export async function requestOtp(id, email) {
  const r = await fetch(`${API}/contracts/${id}/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error("OTP 요청 실패");
  return r.json();
}

/**
 * OTP 검증
 */
export async function verifyOtp(id, body) {
  const r = await fetch(`${API}/contracts/${id}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("OTP 검증 실패");
  return r.json();
}

/**
 * 서명 API (직원/고용주 공용)
 */
export async function signContract(id, body) {
  const r = await fetch(`${API}/contracts/${id}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("서명 실패");
  return r.json();
}

/**
 * 서명패드 이미지 서명 전송 (DRAWN 타입)
 */
export async function submitSignature({ contractId, inviteId, signer, role, signBlob }) {
  return signContract(contractId, {
    inviteId,
    signer,
    sig: "",          // MetaMask 안 쓰므로 빈값
    signType: "DRAWN",
    signBlob,         // base64 PNG
  });
}

const API = "/api";

export async function listContracts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${API}/contracts${qs ? `?${qs}` : ""}`);
  return r.json();
}
export async function getContract(id) {
  const r = await fetch(`${API}/contracts/${id}`);
  return r.json();
}
export async function createContract(body) {
  const r = await fetch(`${API}/contracts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
export async function updateContract(id, body) {
  const r = await fetch(`${API}/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
export async function inviteContract(id, body) {
  const r = await fetch(`${API}/contracts/${id}/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
export async function acceptByToken(token) {
  const r = await fetch(`${API}/contracts/accept?token=${encodeURIComponent(token)}`);
  return r.json();
}
export async function otpSend(email) {
  const r = await fetch(`/auth/email/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  return r.json();
}
export async function otpVerify(email, code) {
  const r = await fetch(`/auth/email/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
  return r.json();
}
export async function signContract(id, body) {
  const r = await fetch(`${API}/contracts/${id}/sign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

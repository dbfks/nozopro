// src/services/index.js
const API = '/api';

export async function uploadContractFile(file) {
  const formData = new FormData();
  formData.append('contract', file);           // multer에서 req.file.fieldname === 'contract'
  const res = await fetch(`${API}/uploadContract`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('파일 업로드 실패');
  return res.json();                           // { cid: string }
}

export async function registerContract(cid, expiryTs) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cid, expiryTs }),
  });
  if (!res.ok) throw new Error('계약 등록 실패');
  return res.json();                           // { txHash: string, id: number }
}

export async function signByEmployer(id) {
  const res = await fetch(`${API}/sign/employer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  // 항상 응답 body를 JSON으로 읽고…
  const data = await res.json();
  //  성공이 아니면 서버가 보낸 error 필드를 메시지로 던집니다
  if (!res.ok) throw new Error(data.error || '고용주 서명 실패');
  return data;  // { txHash }
}

export async function signByWorker(id) {
  const res = await fetch(`${API}/sign/worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('근로자 서명 실패');
  return res.json();                           // { txHash: string }
}

export async function approveContract(id) {
  const res = await fetch(`${API}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('승인 실패');
  return res.json();                           // { txHash: string }
}

export async function getContracts() {
  const res = await fetch('/api/contracts');
  if (!res.ok) throw new Error('계약 목록 조회에 실패했습니다.');
  return res.json();  // 여기서 배열을 반환한다고 가정
}

export async function clockIn(id) {
  const res = await fetch('/api/clock-in', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('출근 기록 실패');
  return res.json();
}

export async function clockOut(id) {
  const res = await fetch('/api/clock-out', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('퇴근 기록 실패');
  return res.json();
}

export async function getEntries(id) {
  const res = await fetch(`/api/entries/${id}`);
  if (!res.ok) throw new Error('기록 조회 실패');
  return res.json();  // { clockIns, clockOuts }
}
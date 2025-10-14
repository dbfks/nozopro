// frontend/src/services/timesheet.js
const API = "/api";

export async function clockIn(agreementId) {
  const res = await fetch(`${API}/clock-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: agreementId }),
  });
  return res.json();
}

export async function clockOut(agreementId) {
  const res = await fetch(`${API}/clock-out`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: agreementId }),
  });
  return res.json();
}

export async function getEntries(agreementId) {
  const res = await fetch(`${API}/entries/${agreementId}`);
  return res.json();
}

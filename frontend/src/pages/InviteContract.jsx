import { useState } from "react";
import { useParams } from "react-router-dom";
import { inviteContract } from "../services/contracts";

export default function InviteContract() {
  const { id } = useParams(); // 계약 ID
  const [form, setForm] = useState({
    inviteeName: "",
    inviteeAddress: "",
    role: "EMPLOYEE",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const body = {
        invitee: { name: form.inviteeName.trim(), address: form.inviteeAddress.trim() },
        role: form.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 유효
      };
      const res = await inviteContract(id, body);
      if (res?.error) throw new Error(res.error);
      setResult(res); // { ok, token, link, invite }
    } catch (err) {
      setError(err.message || "초대 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>근로자 초대</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          근로자 이름
          <input
            name="inviteeName"
            value={form.inviteeName}
            onChange={onChange}
            required
          />
        </label>
        <label>
          근로자 주소(식별자)
          <input
            name="inviteeAddress"
            value={form.inviteeAddress}
            onChange={onChange}
            required
          />
        </label>
        <label>
          역할
          <select name="role" value={form.role} onChange={onChange}>
            <option value="EMPLOYEE">근로자</option>
            <option value="EMPLOYER">고용주</option>
          </select>
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "전송 중..." : "초대 전송"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 16 }}>
          <h3>✅ 초대 완료</h3>
          <p>Invite ID: {result.invite?.id}</p>
          <p>만료일: {new Date(result.invite?.expiresAt).toLocaleString()}</p>
          <p>초대 상태: {result.invite?.status}</p>
          <p>
            초대 링크:{" "}
            <a
              href={`/ui/contracts/${id}/accept?inviteId=${result.invite?.id}`}
              target="_blank"
              rel="noreferrer"
            >
              수락 페이지로 이동
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

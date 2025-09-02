import { useState } from "react";
import { createContract } from "../services/contractService";

export default function ContractCreate() {
  const [form, setForm] = useState({
    title: "근로계약",
    employerName: "Acme HR",
    employerAddress: "0xE1",
    employeeName: "홍길동",
    employeeAddress: "0xE2",
    role: "파트",
    hoursPerWeek: 20,
    startDate: "2025-09-01",
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
    setResult(null);
    try {
      // createContract 바디 구성
      const body = {
        title: form.title,
        employer: { address: form.employerAddress.trim(), name: form.employerName.trim() },
        employee: { address: form.employeeAddress.trim(), name: form.employeeName.trim() },
        docJson: {
          role: form.role,
          hoursPerWeek: Number(form.hoursPerWeek),
          startDate: form.startDate,
        },
        docHash: "", // 최종 승인 시 PDF에서 해시 확정
      };
      const res = await createContract(body);
      if (res?.error) throw new Error(res.error);
      setResult(res); // res.contractId 등 표시
    } catch (err) {
      setError(err.message || "생성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>근로 계약서 작성</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          제목
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            required
            style={{ width: "100%" }}
          />
        </label>

        <fieldset style={{ border: "1px solid #eee", padding: 12 }}>
          <legend>고용주</legend>
          <label style={{ display: "block", marginBottom: 8 }}>
            이름
            <input
              name="employerName"
              value={form.employerName}
              onChange={onChange}
              required
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ display: "block" }}>
            주소(식별자)
            <input
              name="employerAddress"
              value={form.employerAddress}
              onChange={onChange}
              required
              style={{ width: "100%" }}
            />
          </label>
        </fieldset>

        <fieldset style={{ border: "1px solid #eee", padding: 12 }}>
          <legend>근로자</legend>
          <label style={{ display: "block", marginBottom: 8 }}>
            이름
            <input
              name="employeeName"
              value={form.employeeName}
              onChange={onChange}
              required
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ display: "block" }}>
            주소(식별자)
            <input
              name="employeeAddress"
              value={form.employeeAddress}
              onChange={onChange}
              required
              style={{ width: "100%" }}
            />
          </label>
        </fieldset>

        <fieldset style={{ border: "1px solid #eee", padding: 12 }}>
          <legend>근무 조건</legend>
          <label style={{ display: "block", marginBottom: 8 }}>
            직무(역할)
            <input
              name="role"
              value={form.role}
              onChange={onChange}
              required
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            주당 근로시간
            <input
              name="hoursPerWeek"
              type="number"
              min="1"
              value={form.hoursPerWeek}
              onChange={onChange}
              required
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ display: "block" }}>
            시작일
            <input
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={onChange}
              required
              style={{ width: "100%" }}
            />
          </label>
        </fieldset>

        <button type="submit" disabled={submitting} style={{ padding: "10px 16px" }}>
          {submitting ? "저장 중..." : "계약서 저장"}
        </button>
      </form>

      {error && (
        <p style={{ color: "crimson", marginTop: 12 }}>
          오류: {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 16, border: "1px solid #eee", padding: 12 }}>
          <h3>✅ 저장 완료</h3>
          <div>MongoDB _id: <code>{result._id}</code></div>
          <div>contractId: <code>{result.contractId}</code></div>
          <div>status: <b>{result.status}</b></div>

          {/* 2단계에서 초대 보내기 화면으로 연결할 때 사용 */}
          {/* 예: /contracts/:id/invite 페이지를 나중에 만들면 링크를 노출 */}
          {/* <Link to={`/contracts/${result.contractId}/invite`}>초대 보내기</Link> */}
        </div>
      )}
    </div>
  );
}

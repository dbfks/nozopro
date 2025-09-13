import { useState } from "react";
import { createContract } from "../services/contracts";

export default function CreateContract() {
  const [form, setForm] = useState({
    title: "근로계약",
    employer: { name: "Acme HR", address: "0xE1" },
    employee: { name: "홍길동", address: "0xE2" },
    docJson: {
      employer: {
        company: "",
        workplace: "",
        bizNumber: "",
      },
      employee: {
        homeAddress: "",
      },
      contractPeriod: {
        startDate: "",
        endDate: "",
      },
      workplace: "",
      jobDescription: "",
      workingConditions: {
        workHoursPerDay: "",
        workDaysPerWeek: "",
        restTime: "",
        weeklyHoliday: "",
        workType: "",
      },
      wage: {
        type: "시급",
        amount: "",
        paymentDate: "",
        paymentMethod: "계좌이체",
      },
      vacation: "근로기준법에 따른 연차 유급휴가 부여",
      insurances: ["국민연금", "건강보험", "고용보험", "산재보험"],
      termination: "근로기준법에 따른 해지 사유에 의거",
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onChange = (path, value) => {
    setForm((prev) => {
      const updated = { ...prev };
      const keys = path.split(".");
      let obj = updated;
      while (keys.length > 1) {
        const key = keys.shift();
        obj[key] = { ...obj[key] };
        obj = obj[key];
      }
      obj[keys[0]] = value;
      return updated;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await createContract(form);
      if (res?.error) throw new Error(res.error);
      setResult(res);
    } catch (err) {
      setError(err.message || "생성 중 오류 발생");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <h1>근로계약서 작성</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
        {/* 계약 제목 */}
        <label>
          계약 제목
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            required
          />
        </label>

        {/* 고용주 정보 */}
        <fieldset>
          <legend>고용주 정보</legend>
          <input
            placeholder="이름"
            value={form.employer.name}
            onChange={(e) => onChange("employer.name", e.target.value)}
            required
          />
          <input
            placeholder="지갑주소"
            value={form.employer.address}
            onChange={(e) => onChange("employer.address", e.target.value)}
            required
          />
          <input
            placeholder="회사명"
            value={form.docJson.employer.company}
            onChange={(e) => onChange("docJson.employer.company", e.target.value)}
          />
          <input
            placeholder="사업장 주소"
            value={form.docJson.employer.workplace}
            onChange={(e) => onChange("docJson.employer.workplace", e.target.value)}
          />
          <input
            placeholder="사업자등록번호"
            value={form.docJson.employer.bizNumber}
            onChange={(e) => onChange("docJson.employer.bizNumber", e.target.value)}
          />
        </fieldset>

        {/* 근로자 정보 */}
        <fieldset>
          <legend>근로자 정보</legend>
          <input
            placeholder="이름"
            value={form.employee.name}
            onChange={(e) => onChange("employee.name", e.target.value)}
            required
          />
          <input
            placeholder="지갑주소"
            value={form.employee.address}
            onChange={(e) => onChange("employee.address", e.target.value)}
            required
          />
          <input
            placeholder="실거주지 주소"
            value={form.docJson.employee.homeAddress}
            onChange={(e) => onChange("docJson.employee.homeAddress", e.target.value)}
          />
        </fieldset>

        {/* 계약 기간 */}
        <fieldset>
          <legend>계약 기간</legend>
          <label>
            시작일
            <input
              type="date"
              value={form.docJson.contractPeriod.startDate}
              onChange={(e) => onChange("docJson.contractPeriod.startDate", e.target.value)}
            />
          </label>
          <label>
            종료일
            <input
              type="date"
              value={form.docJson.contractPeriod.endDate}
              onChange={(e) => onChange("docJson.contractPeriod.endDate", e.target.value)}
            />
          </label>
        </fieldset>

        {/* 근무 조건 */}
        <fieldset>
          <legend>근무 조건</legend>
          <input
            placeholder="근무 장소"
            value={form.docJson.workplace}
            onChange={(e) => onChange("docJson.workplace", e.target.value)}
          />
          <input
            placeholder="직무"
            value={form.docJson.jobDescription}
            onChange={(e) => onChange("docJson.jobDescription", e.target.value)}
          />
          <input
            type="number"
            placeholder="1일 근로시간"
            value={form.docJson.workingConditions.workHoursPerDay}
            onChange={(e) => onChange("docJson.workingConditions.workHoursPerDay", e.target.value)}
          />
          <input
            type="number"
            placeholder="주당 근무일"
            value={form.docJson.workingConditions.workDaysPerWeek}
            onChange={(e) => onChange("docJson.workingConditions.workDaysPerWeek", e.target.value)}
          />
          <input
            placeholder="휴게시간 (예: 12:00~13:00)"
            value={form.docJson.workingConditions.restTime}
            onChange={(e) => onChange("docJson.workingConditions.restTime", e.target.value)}
          />
          <input
            placeholder="주휴일"
            value={form.docJson.workingConditions.weeklyHoliday}
            onChange={(e) => onChange("docJson.workingConditions.weeklyHoliday", e.target.value)}
          />
          <input
            placeholder="근무형태 (주간/야간)"
            value={form.docJson.workingConditions.workType}
            onChange={(e) => onChange("docJson.workingConditions.workType", e.target.value)}
          />
        </fieldset>

        {/* 임금 */}
        <fieldset>
          <legend>임금</legend>
          <select
            value={form.docJson.wage.type}
            onChange={(e) => onChange("docJson.wage.type", e.target.value)}
          >
            <option value="시급">시급</option>
            <option value="월급">월급</option>
            <option value="연봉">연봉</option>
          </select>
          <input
            type="number"
            placeholder="금액"
            value={form.docJson.wage.amount}
            onChange={(e) => onChange("docJson.wage.amount", e.target.value)}
          />
          <input
            placeholder="지급일 (예: 매월 25일)"
            value={form.docJson.wage.paymentDate}
            onChange={(e) => onChange("docJson.wage.paymentDate", e.target.value)}
          />
          <input
            placeholder="지급 방법"
            value={form.docJson.wage.paymentMethod}
            onChange={(e) => onChange("docJson.wage.paymentMethod", e.target.value)}
          />
        </fieldset>

        <button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "계약서 저장"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 20 }}>
          <h3>✅ 저장 완료</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

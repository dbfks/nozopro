import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getContract, updateContract } from "../services/contracts";

const INSURANCE_OPTIONS = ["고용보험", "산재보험", "국민연금", "건강보험"];

export default function EditContract() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // 계약 데이터 로드
  useEffect(() => {
    async function loadContract() {
      try {
        setLoading(true);
        const contract = await getContract(id);
        setForm(contract);
      } catch (err) {
        setError("계약 조회 실패: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadContract();
  }, [id]);

  // 안전한 중첩 업데이트
  const onChange = (path, value) => {
    setForm((prev) => {
      if (!prev) return prev;
      const updated = structuredClone(prev);
      const keys = path.split(".");
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (typeof obj[k] !== "object" || obj[k] === null) obj[k] = {};
        obj = obj[k];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const amt = Number(form.docJson.wage.amount || 0);
      const payload = {
        ...form,
        docJson: {
          ...form.docJson,
          wage: { ...form.docJson.wage, amount: isNaN(amt) ? 0 : amt },
        },
      };
      const res = await updateContract(id, payload);
      if (res?.error) throw new Error(res.error);
      setResult(res);
    } catch (err) {
      setError(err.message || "수정 중 오류 발생");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>⏳ 계약 정보를 불러오는 중...</p>;
  if (error) return <p style={{ color: "crimson" }}>오류: {error}</p>;
  if (!form) return <p>계약을 불러오지 못했습니다.</p>;

  return (
    <div style={{ maxWidth: 880, margin: "40px auto", padding: 20 }}>
      <h1>계약서 수정</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        계약 ID: {form.contractId} | 상태: {form.status}
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 18 }}>
        {/* 계약 제목 */}
        <label>
          계약 제목
          <input
            type="text"
            value={form.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            required
          />
        </label>

        {/* 고용주 기본 정보 */}
        <fieldset>
          <legend>고용주 지갑/이름</legend>
          <input
            placeholder="고용주 이름"
            value={form.employer?.name || ""}
            onChange={(e) => onChange("employer.name", e.target.value)}
            required
          />
          <input
            placeholder="고용주 지갑주소 (0x...)"
            value={form.employer?.address || ""}
            onChange={(e) => onChange("employer.address", e.target.value)}
            required
          />
        </fieldset>

        {/* 근로자 기본 정보 */}
        <fieldset>
          <legend>근로자 지갑/이름</legend>
          <input
            placeholder="근로자 이름"
            value={form.employee?.name || ""}
            onChange={(e) => onChange("employee.name", e.target.value)}
            required
          />
          <input
            placeholder="근로자 지갑주소 (0x...)"
            value={form.employee?.address || ""}
            onChange={(e) => onChange("employee.address", e.target.value)}
            required
          />
        </fieldset>

        {/* 계약 기간 */}
        <fieldset>
          <legend>1. 근로계약기간</legend>
          <label>
            시작일
            <input
              type="date"
              value={form.docJson?.contractPeriod?.start || ""}
              onChange={(e) =>
                onChange("docJson.contractPeriod.start", e.target.value)
              }
            />
          </label>
          <label>
            종료일
            <input
              type="date"
              value={form.docJson?.contractPeriod?.end || ""}
              onChange={(e) =>
                onChange("docJson.contractPeriod.end", e.target.value)
              }
            />
          </label>
        </fieldset>

        {/* 근무장소 / 업무내용 */}
        <fieldset>
          <legend>2~3. 근무 장소 / 업무 내용</legend>
          <input
            placeholder="근무장소"
            value={form.docJson?.workplace || ""}
            onChange={(e) => onChange("docJson.workplace", e.target.value)}
          />
          <input
            placeholder="업무 내용"
            value={form.docJson?.duty || ""}
            onChange={(e) => onChange("docJson.duty", e.target.value)}
          />
        </fieldset>

        {/* 소정근로시간 / 근무일 */}
        <fieldset>
          <legend>4~5. 소정근로시간 / 근무일</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            <input
              placeholder="시작 (예: 09:00)"
              value={form.docJson?.workingHours?.start || ""}
              onChange={(e) =>
                onChange("docJson.workingHours.start", e.target.value)
              }
            />
            <input
              placeholder="종료 (예: 18:00)"
              value={form.docJson?.workingHours?.end || ""}
              onChange={(e) =>
                onChange("docJson.workingHours.end", e.target.value)
              }
            />
            <input
              placeholder="휴게 (예: 12:00~13:00)"
              value={form.docJson?.workingHours?.break || ""}
              onChange={(e) =>
                onChange("docJson.workingHours.break", e.target.value)
              }
            />
          </div>
          <input
            placeholder="근무일(예: 월~금 / 격주 토)"
            value={form.docJson?.workDays || ""}
            onChange={(e) => onChange("docJson.workDays", e.target.value)}
          />
        </fieldset>

        {/* 임금 */}
        <fieldset>
          <legend>6. 임금</legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select
              value={form.docJson?.wage?.type || "월급"}
              onChange={(e) => onChange("docJson.wage.type", e.target.value)}
            >
              <option value="시급">시급</option>
              <option value="월급">월급</option>
              <option value="연봉">연봉</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="금액"
              value={form.docJson?.wage?.amount ?? ""}
              onChange={(e) => onChange("docJson.wage.amount", e.target.value)}
            />
          </div>
          <input
            placeholder="지급일 (예: 매월 25일)"
            value={form.docJson?.wage?.paymentDate || ""}
            onChange={(e) => onChange("docJson.wage.paymentDate", e.target.value)}
          />
          <input
            placeholder="지급 방법 (예: 계좌이체)"
            value={form.docJson?.wage?.method || ""}
            onChange={(e) => onChange("docJson.wage.method", e.target.value)}
          />
        </fieldset>

        {/* 휴가 & 4대보험 */}
        <fieldset>
          <legend>휴가 및 사회보험</legend>

          <label>
            연차/휴가
            <input
              type="text"
              placeholder="예: 근로기준법에 따른 연차 유급휴가 부여"
              value={form.docJson?.vacation || ""}
              onChange={(e) => onChange("docJson.vacation", e.target.value)}
            />
          </label>

          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>
              사회보험(복수 선택 가능)
            </div>
            {INSURANCE_OPTIONS.map((opt) => {
              const checked = (form.docJson?.insurances || []).includes(opt);
              return (
                <label key={opt} style={{ marginRight: 12 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setForm((prev) => {
                        if (!prev) return prev;
                        const next = structuredClone(prev);
                        const set = new Set(next.docJson.insurances || []);
                        if (e.target.checked) set.add(opt);
                        else set.delete(opt);
                        next.docJson.insurances = Array.from(set);
                        return next;
                      })
                    }
                  />
                  <span style={{ marginLeft: 4 }}>{opt}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 사업주/근로자 상세 / 작성일 */}
        <fieldset>
          <legend>9~10. 당사자 정보 / 작성일</legend>
          <h4>사업주</h4>
          <input
            placeholder="사업체명"
            value={form.docJson?.employer?.company || ""}
            onChange={(e) => onChange("docJson.employer.company", e.target.value)}
          />
          <input
            placeholder="사업장 주소"
            value={form.docJson?.employer?.address || ""}
            onChange={(e) => onChange("docJson.employer.address", e.target.value)}
          />
          <input
            placeholder="전화번호"
            value={form.docJson?.employer?.phone || ""}
            onChange={(e) => onChange("docJson.employer.phone", e.target.value)}
          />

          <h4 style={{ marginTop: 12 }}>근로자</h4>
          <input
            placeholder="주소"
            value={form.docJson?.employee?.address || ""}
            onChange={(e) => onChange("docJson.employee.address", e.target.value)}
          />
          <input
            placeholder="전화번호"
            value={form.docJson?.employee?.phone || ""}
            onChange={(e) => onChange("docJson.employee.phone", e.target.value)}
          />

          <label style={{ marginTop: 12 }}>
            작성일
            <input
              type="date"
              value={form.docJson?.signedDate || ""}
              onChange={(e) => onChange("docJson.signedDate", e.target.value)}
            />
          </label>
        </fieldset>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button type="submit" disabled={submitting}>
            {submitting ? "수정 중..." : "계약서 수정"}
          </button>
          <a
            href={`/ui/contracts/${id}/view`}
            style={{
              background: "#6b7280",
              color: "white",
              padding: "10px 16px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            취소
          </a>
        </div>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {result && (
        <div style={{ 
          marginTop: 20, 
          padding: 20, 
          background: "#f0f9ff", 
          border: "1px solid #0ea5e9", 
          borderRadius: 8 
        }}>
          <h3 style={{ color: "#0369a1", margin: "0 0 16px 0" }}>✅ 계약서 수정 완료!</h3>
          <div style={{ display: "flex", gap: 12 }}>
            <a
              href={`/ui/contracts/${id}/view`}
              style={{
                background: "#3b82f6",
                color: "white",
                padding: "10px 16px",
                borderRadius: 6,
                textDecoration: "none",
                fontWeight: 500,
                display: "inline-block"
              }}
            >
              📋 수정된 계약서 보기
            </a>
            <a
              href={`/ui/contracts/${id}/invite`}
              style={{
                background: "#10b981",
                color: "white",
                padding: "10px 16px",
                borderRadius: 6,
                textDecoration: "none",
                fontWeight: 500,
                display: "inline-block"
              }}
            >
              👥 근로자 초대하기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

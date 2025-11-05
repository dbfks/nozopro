// frontend/src/pages/CreateContract.jsx
import { useState } from "react";
import { createContract } from "../services/contracts";
import "./CreateContract.css";

const INSURANCE_OPTIONS = ["고용보험", "산재보험", "국민연금", "건강보험"];

export default function CreateContract() {
  // 현재 로그인한 사용자 정보 가져오기
  const currentUser = JSON.parse(localStorage.getItem("user"));
  
  const [form, setForm] = useState({
    title: "근로계약",
    // ✅ 현재 로그인한 사용자를 고용주로 설정
    employer: { 
      name: currentUser?.name || "고용주", 
      address: currentUser?.walletAddress || "" 
    },
    employee: { name: "", address: "" }, // 근로자는 초대 시 설정

    // PDF 스키마
    docJson: {
      contractPeriod: { start: "", end: "" },
      workplace: "",
      duty: "",
      workingHours: { start: "", end: "", break: "" },
      workDays: "",
      wage: { type: "월급", amount: "", paymentDate: "", method: "계좌이체" },
      vacation: "근로기준법에 따른 연차 유급휴가를 부여한다.",
      // ✅ 복수 선택용으로 통일
      insurances: ["고용보험", "산재보험", "국민연금", "건강보험"],
      employer: { company: "", address: "", phone: "" },
      employee: { address: "", phone: "" },
      signedDate: "",
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [hasContractPeriod, setHasContractPeriod] = useState(true);

  // ✅ 안전한 중첩 업데이트 (깊은복사 + 중간객체 자동 생성)
  const onChange = (path, value) => {
    setForm((prev) => {
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
      const res = await createContract(payload);
      if (res?.error) throw new Error(res.error);
      setResult(res);
    } catch (err) {
      setError(err.message || "생성 중 오류 발생");
    } finally {
      setSubmitting(false);
    }
  };

  const getCharacterCount = (text, max) => {
    return (text || "").length;
  };

  return (
    <div className="create-contract-container">
      <div className="create-contract-header">
        <h1 className="create-contract-title">근로계약서 작성</h1>
        <p className="create-contract-subtitle">표준근로계약서를 작성해주세요</p>
      </div>

      <form onSubmit={onSubmit}>
        {/* 기본 정보 섹션 */}
        <div className="form-section">
          <h2 className="section-title">기본 정보</h2>
          
          <div className="form-group">
            <label className="form-label">계약 제목</label>
            <input
              type="text"
              className="form-input"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="예: 표준근로계약서"
              required
            />
          </div>

          <div className="section-subtitle">고용주 정보</div>
          <div className="form-group">
            <label className="form-label">고용주 이름</label>
            <input
              type="text"
              className="form-input"
              placeholder="고용주 이름을 입력해주세요"
              value={form.employer?.name || ""}
              onChange={(e) => onChange("employer.name", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">고용주 지갑주소</label>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={form.employer?.address || ""}
              onChange={(e) => onChange("employer.address", e.target.value)}
              required
            />
          </div>

          <div className="section-subtitle">근로자 정보</div>
          <div className="form-group">
            <label className="form-label">근로자 이름</label>
            <input
              type="text"
              className="form-input"
              placeholder="근로자 이름을 입력해주세요"
              value={form.employee?.name || ""}
              onChange={(e) => onChange("employee.name", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">근로자 지갑주소</label>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={form.employee?.address || ""}
              onChange={(e) => onChange("employee.address", e.target.value)}
              required
            />
          </div>
        </div>

        {/* 계약 기간 */}
        <div className="form-section">
          <h2 className="section-title">1. 근로계약기간</h2>
          
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${hasContractPeriod ? "active" : ""}`}
              onClick={() => {
                setHasContractPeriod(true);
              }}
            >
              계약기간 있음
            </button>
            <button
              type="button"
              className={`toggle-btn ${!hasContractPeriod ? "active" : ""}`}
              onClick={() => {
                setHasContractPeriod(false);
              }}
            >
              계약기간 미정
            </button>
          </div>

          {hasContractPeriod && (
            <div className="date-group">
              <div className="date-input-wrapper">
                <input
                  type="date"
                  className="form-input"
                  value={form.docJson?.contractPeriod?.start || ""}
                  onChange={(e) => {
                    onChange("docJson.contractPeriod.start", e.target.value);
                  }}
                />
              </div>
              <span className="date-separator">~</span>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  className="form-input"
                  placeholder="날짜선택"
                  value={form.docJson?.contractPeriod?.end || ""}
                  onChange={(e) => {
                    onChange("docJson.contractPeriod.end", e.target.value);
                  }}
                />
              </div>
            </div>
          )}
          
          <p className="help-text">
            * 근로계약을 정하지 않는 경우에는 '근로게시일'만 기재합니다.
          </p>
        </div>

        {/* 근무장소 / 업무내용 */}
        <div className="form-section">
          <h2 className="section-title">2. 근무장소 및 업무내용</h2>
          
          <div className="form-group">
            <label className="form-label">근무장소</label>
            <textarea
              className="form-textarea"
              placeholder="근무장소를 입력해 주세요."
              value={form.docJson?.workplace || ""}
              onChange={(e) => {
                onChange("docJson.workplace", e.target.value);
              }}
              maxLength={50}
              rows={3}
            />
            <div className={`char-counter ${getCharacterCount(form.docJson?.workplace, 50) > 45 ? "warning" : ""}`}>
              {getCharacterCount(form.docJson?.workplace, 50)}/50
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">업무의 내용</label>
            <textarea
              className="form-textarea"
              placeholder="업무의 내용을 입력해 주세요."
              value={form.docJson?.duty || ""}
              onChange={(e) => {
                onChange("docJson.duty", e.target.value);
              }}
              maxLength={80}
              rows={4}
            />
            <div className={`char-counter ${getCharacterCount(form.docJson?.duty, 80) > 75 ? "warning" : ""}`}>
              {getCharacterCount(form.docJson?.duty, 80)}/80
            </div>
          </div>
        </div>

        {/* 소정근로시간 / 근무일 */}
        <div className="form-section">
          <h2 className="section-title">3. 소정근로시간 및 근무일</h2>
          
          <div className="form-group">
            <label className="form-label">근무 시간</label>
            <div className="time-group">
              <input
                type="time"
                className="form-input"
                placeholder="시작 (예: 09:00)"
                value={form.docJson?.workingHours?.start || ""}
                onChange={(e) => {
                  onChange("docJson.workingHours.start", e.target.value);
                }}
              />
              <input
                type="time"
                className="form-input"
                placeholder="종료 (예: 18:00)"
                value={form.docJson?.workingHours?.end || ""}
                onChange={(e) => {
                  onChange("docJson.workingHours.end", e.target.value);
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="휴게 (예: 12:00~13:00)"
                value={form.docJson?.workingHours?.break || ""}
                onChange={(e) => {
                  onChange("docJson.workingHours.break", e.target.value);
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">근무일</label>
            <input
              type="text"
              className="form-input"
              placeholder="근무일(예: 월~금 / 격주 토)"
              value={form.docJson?.workDays || ""}
              onChange={(e) => {
                onChange("docJson.workDays", e.target.value);
              }}
            />
          </div>
        </div>

        {/* 임금 */}
        <div className="form-section">
          <h2 className="section-title">4. 임금</h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">임금 유형</label>
              <select
                className="form-select"
                value={form.docJson?.wage?.type || "월급"}
                onChange={(e) => onChange("docJson.wage.type", e.target.value)}
              >
                <option value="시급">시급</option>
                <option value="월급">월급</option>
                <option value="연봉">연봉</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">금액</label>
              <input
                type="number"
                min="0"
                className="form-input"
                placeholder="금액을 입력해주세요"
                value={form.docJson?.wage?.amount ?? ""}
                onChange={(e) => onChange("docJson.wage.amount", e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">지급일</label>
            <input
              type="text"
              className="form-input"
              placeholder="지급일 (예: 매월 25일)"
              value={form.docJson?.wage?.paymentDate || ""}
              onChange={(e) => onChange("docJson.wage.paymentDate", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">지급 방법</label>
            <input
              type="text"
              className="form-input"
              placeholder="지급 방법 (예: 계좌이체)"
              value={form.docJson?.wage?.method || ""}
              onChange={(e) => onChange("docJson.wage.method", e.target.value)}
            />
          </div>
        </div>

        {/* 휴가 & 4대보험 */}
        <div className="form-section">
          <h2 className="section-title">5. 휴가 및 사회보험</h2>

          <div className="form-group">
            <label className="form-label">연차/휴가</label>
            <input
              type="text"
              className="form-input"
              placeholder="예: 근로기준법에 따른 연차 유급휴가 부여"
              value={form.docJson?.vacation || ""}
              onChange={(e) => onChange("docJson.vacation", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">사회보험 (복수 선택 가능)</label>
            <div className="checkbox-group">
              {INSURANCE_OPTIONS.map((opt) => {
                const checked = (form.docJson?.insurances || []).includes(opt);
                return (
                  <label
                    key={opt}
                    className={`checkbox-item ${checked ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm((prev) => {
                          const next = structuredClone(prev);
                          const set = new Set(next.docJson.insurances || []);
                          if (e.target.checked) set.add(opt);
                          else set.delete(opt);
                          next.docJson.insurances = Array.from(set);
                          return next;
                        })
                      }
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* 사업주/근로자 상세 / 작성일 */}
        <div className="form-section">
          <h2 className="section-title">6. 당사자 정보 및 작성일</h2>
          
          <div className="section-subtitle">사업주</div>
          <div className="form-group">
            <label className="form-label optional">사업체명</label>
            <input
              type="text"
              className="form-input"
              placeholder="사업체명을 입력해주세요"
              value={form.docJson?.employer?.company || ""}
              onChange={(e) => onChange("docJson.employer.company", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label optional">사업장 주소</label>
            <input
              type="text"
              className="form-input"
              placeholder="사업장 주소를 입력해주세요"
              value={form.docJson?.employer?.address || ""}
              onChange={(e) => onChange("docJson.employer.address", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label optional">전화번호</label>
            <input
              type="tel"
              className="form-input"
              placeholder="전화번호를 입력해주세요"
              value={form.docJson?.employer?.phone || ""}
              onChange={(e) => onChange("docJson.employer.phone", e.target.value)}
            />
          </div>

          <div className="section-subtitle">근로자</div>
          <div className="form-group">
            <label className="form-label optional">주소</label>
            <input
              type="text"
              className="form-input"
              placeholder="주소를 입력해주세요"
              value={form.docJson?.employee?.address || ""}
              onChange={(e) => onChange("docJson.employee.address", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label optional">전화번호</label>
            <input
              type="tel"
              className="form-input"
              placeholder="전화번호를 입력해주세요"
              value={form.docJson?.employee?.phone || ""}
              onChange={(e) => onChange("docJson.employee.phone", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label optional">작성일</label>
            <input
              type="date"
              className="form-input"
              value={form.docJson?.signedDate || ""}
              onChange={(e) => onChange("docJson.signedDate", e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? "저장 중..." : "계약서 저장하기"}
        </button>
      </form>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}
      
      {result && (
        <div className="success-card">
          <div className="success-title">
            ✅ 계약서 저장 완료!
          </div>
          <div className="success-info">
            <p style={{ margin: "0 0 8px 0", color: "#374151" }}>
              계약 ID:
            </p>
            <code>{result.contractId}</code>
          </div>
          
          <div className="success-actions">
            <a
              href={`/ui/contracts/${result.contractId}/view`}
              className="success-btn success-btn-primary"
            >
              계약서 보기
            </a>
            
            <a
              href={`/ui/contracts/${result.contractId}/invite`}
              className="success-btn success-btn-secondary"
            >
              근로자 초대하기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

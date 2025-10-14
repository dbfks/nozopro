import React from "react";

function pick(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
  return "";
}

function text(v) {
  return v ? String(v) : "";
}

export default function ContractPreview({ contract }) {
  const cj = contract?.docJson || {};

  const periodStart = pick(cj?.contractPeriod?.startDate, cj?.contractPeriod?.start);
  const periodEnd = pick(cj?.contractPeriod?.endDate, cj?.contractPeriod?.end);

  const workplace = pick(cj?.workplace);
  const duty = pick(cj?.jobDescription, cj?.duty);

  const workHoursPerDay = pick(cj?.workingConditions?.workHoursPerDay);
  const restTime = pick(cj?.workingConditions?.restTime, cj?.workingHours?.break);
  const workDaysPerWeek = pick(cj?.workingConditions?.workDaysPerWeek, cj?.workDays);
  const weeklyHoliday = pick(cj?.workingConditions?.weeklyHoliday);
  const workType = pick(cj?.workingConditions?.workType);

  const wageType = pick(cj?.wage?.type);
  const wageAmount = pick(cj?.wage?.amount);
  const wagePaymentDate = pick(cj?.wage?.paymentDate);
  const wageMethod = pick(cj?.wage?.paymentMethod, cj?.wage?.method);

  const insurances = Array.isArray(cj?.insurances) ? cj.insurances : [];

  const employer = cj?.employer || {};
  const employee = cj?.employee || {};
  const signedDate = pick(cj?.signedDate, cj?.date);
  const employeeSign = (contract?.signatures || []).find((s) => s.role === "EMPLOYEE");
  const employerSign = (contract?.signatures || []).find((s) => s.role === "EMPLOYER");

  const section = {
    title: { fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 8 },
    h2: { fontSize: 14, fontWeight: 700, margin: "18px 0 8px" },
    row: { margin: "4px 0" },
    label: { fontWeight: 600, display: "inline-block", minWidth: 120 },
    line: { borderTop: "1px solid #e5e7eb", margin: "16px 0" },
    box: { background: "#fff", padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 },
  };

  const check = (label) => (
    <div style={{ marginRight: 14, display: "inline-block" }} key={label}>
      <span style={{ marginRight: 6 }}>{insurances.includes(label) ? "■" : "□"}</span>
      <span>{label}</span>
    </div>
  );

  const formatKRDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return text(d);
    return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  };

  return (
    <div style={section.box}>
      <div style={section.title}>표준근로계약서(기간의 정함이 있는 경우)</div>

      <div style={section.h2}>1. 근로계약기간</div>
      <div style={section.row}>{text(periodStart)} 부터 {text(periodEnd)} 까지</div>

      <div style={section.h2}>2. 근무 장소</div>
      <div style={section.row}>{text(workplace)}</div>

      <div style={section.h2}>3. 업무의 내용</div>
      <div style={section.row}>{text(duty)}</div>

      <div style={section.h2}>4. 소정근로시간</div>
      <div style={section.row}><span style={section.label}>1일 근로시간</span>{text(workHoursPerDay) && `${workHoursPerDay} 시간`}</div>
      <div style={section.row}><span style={section.label}>휴게시간</span>{text(restTime)}</div>

      <div style={section.h2}>5. 근무일/휴일</div>
      <div style={section.row}><span style={section.label}>주당 근무일</span>{text(workDaysPerWeek)}</div>
      <div style={section.row}><span style={section.label}>주휴일</span>{text(weeklyHoliday)}</div>
      <div style={section.row}><span style={section.label}>근무형태</span>{text(workType)}</div>

      <div style={section.h2}>6. 임금</div>
      <div style={section.row}><span style={section.label}>임금형태</span>{text(wageType)}</div>
      <div style={section.row}><span style={section.label}>금액</span>{text(wageAmount) && `${wageAmount} 원`}</div>
      <div style={section.row}><span style={section.label}>지급일</span>{text(wagePaymentDate)}</div>
      <div style={section.row}><span style={section.label}>지급방법</span>{text(wageMethod)}</div>

      <div style={section.h2}>7. 연차유급휴가</div>
      <div style={section.row}>{text(cj?.vacation) || "근로기준법에서 정하는 바에 따라 부여함."}</div>

      <div style={section.h2}>8. 사회보험 적용여부</div>
      <div style={{ marginTop: 2 }}>
        {check("고용보험")}
        {check("산재보험")}
        {check("국민연금")}
        {check("건강보험")}
      </div>

      <div style={section.h2}>9. 근로계약서 교부</div>
      <div style={section.row}>사업주는 근로계약 체결과 동시에 사본을 근로자에게 교부함.</div>

      <div style={section.h2}>10. 성실한 이행의무</div>
      <div style={section.row}>근로계약, 취업규칙, 단체협약을 성실히 이행함.</div>

      <div style={section.line} />

      <div style={{ textAlign: "center", marginBottom: 12 }}>{formatKRDate(signedDate) || "년  월  일"}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>(사업주)</div>
          <div style={section.row}><span style={section.label}>사업체명</span>{text(pick(employer?.company, contract?.employer?.name))}</div>
          <div style={section.row}><span style={section.label}>주소</span>{text(pick(employer?.address, employer?.workplace))}</div>
          <div style={section.row}><span style={section.label}>대표자</span>{text(pick(contract?.employer?.name))}</div>
          <div style={section.row}><span style={section.label}>전화</span>{text(employer?.phone)}</div>
          <div style={{ marginTop: 10 }}>
            {employerSign?.signBlob?.startsWith("data:image/") ? (
              <div>
                <img alt="employer-sign" src={employerSign.signBlob} style={{ height: 48, objectFit: "contain" }} />
                <div style={{ fontSize: 12, color: "#6b7280" }}>(서명)</div>
              </div>
            ) : (
              <div style={{ height: 48, borderTop: "1px solid #9ca3af", marginTop: 8 }} />
            )}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>(근로자)</div>
          <div style={section.row}><span style={section.label}>주소</span>{text(employee?.address)}</div>
          <div style={section.row}><span style={section.label}>연락처</span>{text(employee?.phone)}</div>
          <div style={section.row}><span style={section.label}>성명</span>{text(pick(contract?.employee?.name))}</div>
          <div style={{ marginTop: 10 }}>
            {employeeSign?.signBlob?.startsWith("data:image/") ? (
              <div>
                <img alt="employee-sign" src={employeeSign.signBlob} style={{ height: 48, objectFit: "contain" }} />
                <div style={{ fontSize: 12, color: "#6b7280" }}>(서명)</div>
              </div>
            ) : (
              <div style={{ height: 48, borderTop: "1px solid #9ca3af", marginTop: 8 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



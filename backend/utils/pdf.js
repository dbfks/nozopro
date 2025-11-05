// backend/utils/pdf.js
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { resolve } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const fontPath = resolve("backend/fonts/NanumGothic-Regular.ttf");

// ---- helpers -------------------------------------------------
const u = (v) => (v ? String(v) : ""); // undefined-safe
// undefined/null/빈문자열을 건너뛰고 처음 유효한 값을 반환
const pick = (...vals) => {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
  return "";
};

// 근무시간 계산 (시:분 형식에서 시간 차이 계산)
function calculateWorkHours(startTime, endTime) {
  if (!startTime || !endTime) return "";
  try {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = endMinutes - startMinutes;
    const hours = diffMinutes / 60;
    return hours > 0 ? Math.round(hours * 10) / 10 : ""; // 소수점 1자리까지
  } catch {
    return "";
  }
}

function underlineText(doc, label, value, widthPerUnderline = 45) {
  doc.text(label, { continued: true });
  const v = u(value);
  // 값이 없으면 밑줄만, 있으면 값과 함께 밑줄
  const shown = v || "";
  const need = Math.max(0, Math.ceil((widthPerUnderline - shown.length)));
  const line = " ".repeat(1) + "_".repeat(need);
  doc.text(shown + line);
}

function checkbox(doc, label, checked) {
  doc.text(`${checked ? "■" : "□"} ${label}`, { continued: true });
  doc.text("        ", { continued: true }); // 더 넓은 간격
}

// 한 줄에 하나씩 표시하는 체크박스(개별 라인)
function checkboxLine(doc, label, checked, indent = 2) {
  const pad = " ".repeat(indent);
  doc.text(pad + `${checked ? "■" : "□"} ${label}`);
}

function sectionTitle(doc, text) {
  doc.moveDown(0.5);
  doc.fontSize(10).text(text);
  doc.moveDown(0.2);
}

function smallLabel(doc, label, value, indent = 20) {
  doc.moveDown(0.1);
  doc.text("".padStart(indent, " ") + `${label} : ${u(value)}`);
}

// 한 줄 밑줄형 라벨: "(라벨)  ______" 형태로 값이 있으면 값 + 나머지 밑줄
function drawLabeledLine(
  doc,
  { x, y, label, value = "", underlineChars = 22 } // 필요하면 underlineChars로 길이 조절
) {
  doc.text(label, x, y, { continued: true });
  const shown = u(value);
  const rest = Math.max(0, underlineChars - shown.length);
  const line = (shown ? shown + " " : "") + "_".repeat(rest);
  doc.text(line);
  return y + 16; // 다음 줄 y 반환
}

// 서명선 그리기: 밑줄 + "(서명)"
function drawSignatureLine(doc, { x, y, width = 120 }) {
  const lineY = y + 12;
  doc.moveTo(x, lineY).lineTo(x + width, lineY).stroke();
  doc.fontSize(9).text("(서명)", x + width - 26, lineY + 4);
}

// 가로 구분선
function lineY(doc, gap = 6) {
  const y = doc.y + 3;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  doc.moveDown(gap / 10);
}

// ---- main ----------------------------------------------------
export async function buildContractPdf({ contract, employeeSign, employerSign }) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (c) => chunks.push(c));
  doc.pipe(stream);

  // font
  if (fs.existsSync(fontPath)) {
    doc.registerFont("Korean", fontPath);
    doc.font("Korean");
  } else {
    console.warn("⚠️ Korean font not found. Using Helvetica.");
    doc.font("Helvetica");
  }

  // title
  doc.fontSize(16).text("표준근로계약서(기간의 정함이 있는 경우)", { align: "center" });
  doc.moveDown(0.8);
  doc.fontSize(9);

  // 머리말
  const empName = u(contract?.employer?.name);
  const wrkName = u(contract?.employee?.name);
  doc.text(`사업주 ${empName}(이하 "사업주"라 함)와(과) ${wrkName}(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.`);
  doc.moveDown(0.6);

  // 1. 근로계약기간
  sectionTitle(doc, "1. 근로계약기간");
  const sDate = u(pick(
    contract?.docJson?.contractPeriod?.startDate,
    contract?.docJson?.contractPeriod?.start
  ));
  const eDate = u(pick(
    contract?.docJson?.contractPeriod?.endDate,
    contract?.docJson?.contractPeriod?.end
  ));
  underlineText(doc, "  ", `${sDate}  부터  ${eDate}  까지`);

  // 2. 근무 장소
  sectionTitle(doc, "2. 근무 장소");
  underlineText(doc, "  ", contract?.docJson?.workplace);

  // 3. 업무의 내용
  sectionTitle(doc, "3. 업무의 내용");
  underlineText(doc, "  ", pick(
    contract?.docJson?.jobDescription,
    contract?.docJson?.duty
  ));

  // 4. 소정근로시간
  sectionTitle(doc, "4. 소정근로시간");
  // 프론트엔드에서 workingHours: { start, end, break } 형태로 보내는 경우 처리
  const workHours = contract?.docJson?.workingHours;
  let hours = u(pick(
    contract?.docJson?.workingConditions?.workHoursPerDay,
    workHours?.start && workHours?.end ? calculateWorkHours(workHours.start, workHours.end) : null
  ));
  underlineText(doc, "  1일 근로시간 : ", hours ? `${hours} 시간` : "");
  smallLabel(doc, "휴게시간", pick(
    contract?.docJson?.workingConditions?.restTime,
    contract?.docJson?.workingHours?.break
  ), 26);

  // 5. 근무일/휴일
  sectionTitle(doc, "5. 근무일/휴일");
  underlineText(doc, "  주당 근무일 : ", pick(
    contract?.docJson?.workingConditions?.workDaysPerWeek,
    contract?.docJson?.workDays
  ));
  doc.moveDown(0.1);
  smallLabel(doc, "주휴일", contract?.docJson?.workingConditions?.weeklyHoliday, 26);
  smallLabel(doc, "근무형태", contract?.docJson?.workingConditions?.workType, 26);

  // 6. 임금
  sectionTitle(doc, "6. 임금");
  smallLabel(doc, "임금형태", contract?.docJson?.wage?.type);
  smallLabel(doc, "금액", contract?.docJson?.wage?.amount ? `${contract.docJson.wage.amount} 원` : "");
  smallLabel(doc, "지급일", contract?.docJson?.wage?.paymentDate);
  smallLabel(doc, "지급방법", pick(
    contract?.docJson?.wage?.paymentMethod,
    contract?.docJson?.wage?.method
  ));

  // 7. 연차유급휴가
  sectionTitle(doc, "7. 연차유급휴가");
  doc.text("  근로기준법에서 정하는 바에 따라 부여함.");

  // 8. 사회보험 적용여부(해당란에 체크)
  sectionTitle(doc, "8. 사회보험 적용여부(해당란에 체크)");
  const ins = contract?.docJson?.insurances || [];
  
  // 네 줄로 각각 출력(겹침 방지)
  checkboxLine(doc, "고용보험", ins.includes("고용보험"));
  checkboxLine(doc, "산재보험", ins.includes("산재보험"));
  checkboxLine(doc, "국민연금", ins.includes("국민연금"));
  checkboxLine(doc, "건강보험", ins.includes("건강보험"));
  // 다음 항목(9번)과 간격 확보
  doc.moveDown(0.2);

  // 9. 근로계약서 교부
  sectionTitle(doc, "9. 근로계약서 교부");
  doc.text("  사업주는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자에게 교부한다(근로기준법 제17조 이행).");

  // 10. 근로계약, 취업규칙 등의 성실한 이행의무
  sectionTitle(doc, "10. 근로계약, 취업규칙 등의 성실한 이행의무");
  doc.text("  사업주와 근로자는 각각 근로계약, 취업규칙, 단체협약을 지키고 성실하게 이행하여야 함.");

  // ========== 11. 기타 ==========
  sectionTitle(doc, "11. 기타");
  doc.text("  이 계약에 정함이 없는 사항은 근로기준법령에 의함.");
  doc.moveDown(0.8);

  // ── 여기서부터 “원본 양식 같은 하단” 깔끔하게 ─────────────────

  // ① 중앙 정렬 ‘년 월 일’
  const signedDate = pick(
    contract?.docJson?.signedDate,      // 새 구조
    contract?.docJson?.date             // 보조
  );
  let yDate = doc.y + 6;
  doc.fontSize(11);
  const cx = 297; // A4 가운데 x
  if (signedDate) {
    const d = new Date(signedDate);
    const line = `${d.getFullYear()}  년    ${d.getMonth() + 1}  월    ${d.getDate()}  일`;
    doc.text(line, 0, yDate, { width: 595 - 100, align: "center" });
  } else {
    doc.text("      년          월          일", 0, yDate, { width: 595 - 100, align: "center" });
  }
  doc.moveDown(1.4);

  // ② 좌우 칼럼 레이아웃
  const leftX = 70, rightX = 340;
  let yL = doc.y, yR = doc.y;

  doc.fontSize(11).text("(사업주)", leftX, yL - 12);
  doc.fontSize(11).text("(근로자)", rightX, yR - 12);

  doc.fontSize(10);

  // 사업주 필드 값(새/옛 키 모두 대응)
  const bizName   = pick(contract?.docJson?.employer?.company, contract?.employer?.name);
  const bizAddr   = pick(contract?.docJson?.employer?.address, contract?.docJson?.employer?.workplace);
  const bizOwner  = pick(contract?.employer?.name); // 대표자
  const bizPhone  = pick(contract?.docJson?.employer?.phone);

  // 근로자 필드 값
  const workerAddr  = pick(contract?.docJson?.employee?.address, contract?.docJson?.employee?.homeAddress);
  const workerPhone = pick(contract?.docJson?.employee?.phone);
  const workerName  = pick(contract?.employee?.name);

  // 왼쪽(사업주)
  yL = drawLabeledLine(doc, { x: leftX,  y: yL, label: "사업체명 :", value: bizName });
  yL = drawLabeledLine(doc, { x: leftX,  y: yL, label: "주   소 :", value: bizAddr });
  yL = drawLabeledLine(doc, { x: leftX,  y: yL, label: "대 표 자 :", value: bizOwner });
  yL = drawLabeledLine(doc, { x: leftX,  y: yL, label: "전  화 :",  value: bizPhone });

  // 오른쪽(근로자)
  yR = drawLabeledLine(doc, { x: rightX, y: yR, label: "주   소 :", value: workerAddr });
  yR = drawLabeledLine(doc, { x: rightX, y: yR, label: "연 락 처 :", value: workerPhone });
  yR = drawLabeledLine(doc, { x: rightX, y: yR, label: "성   명 :", value: workerName });

  const sigY = Math.max(yL, yR) + 6;

  // ③ (서명) – 이미지 있으면 올리고, 없으면 밑줄 + (서명)
  const sigW = 120;

  // 사업주 서명
  if (employerSign?.signBlob?.startsWith("data:image/")) {
    const buf = Buffer.from(employerSign.signBlob.split(",")[1], "base64");
    doc.image(buf, leftX, sigY - 6, { fit: [sigW, 40] });
    doc.fontSize(9).text("(서명)", leftX + sigW - 26, sigY + 32);
  } else {
    drawSignatureLine(doc, { x: leftX, y: sigY, width: sigW });
  }

  // 근로자 서명
  if (employeeSign?.signBlob?.startsWith("data:image/")) {
    const buf = Buffer.from(employeeSign.signBlob.split(",")[1], "base64");
    doc.image(buf, rightX, sigY - 6, { fit: [sigW, 40] });
    doc.fontSize(9).text("(서명)", rightX + sigW - 26, sigY + 32);
  } else {
    drawSignatureLine(doc, { x: rightX, y: sigY, width: sigW });
  }

  // 하단 구분선 + 소형 부가정보(선택)
  doc.moveDown(4);
  lineY(doc, 8);
  doc.fontSize(9);
  if (bizPhone) doc.text(`전화번호 : ${bizPhone}`, { continued: true });
  if (bizOwner) doc.text(`   대표자 : ${bizOwner}`, { continued: true });
  if (workerPhone) doc.text(`   근로자 전화 : ${workerPhone}`);

  // finish
  doc.end();
  await new Promise((r) => stream.on("end", r));
  return Buffer.concat(chunks);
}
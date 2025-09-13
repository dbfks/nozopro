// backend/utils/pdf.js
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { resolve } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const fontPath = resolve("backend/fonts/NanumGothic-Regular.ttf");

// 테이블 출력 헬퍼
function drawTable(doc, rows, startX, startY, col1Width, col2Width, rowHeight = 28) {
  let y = startY;

  rows.forEach((row, idx) => {
    // 배경색 (짝수 행)
    if (idx % 2 === 0) {
      doc.save();
      doc.rect(startX, y, col1Width + col2Width, rowHeight).fill("#f5f5f5");
      doc.restore();
    }

    // 테두리
    doc.rect(startX, y, col1Width + col2Width, rowHeight).stroke();

    // 텍스트
    doc.fontSize(11).fillColor("black");
    doc.text(row.label, startX + 5, y + 8, { width: col1Width - 10 });
    doc.text(row.value ?? "", startX + col1Width + 5, y + 8, {
      width: col2Width - 10,
    });

    y += rowHeight;
  });

  return y;
}

export async function buildContractPdf({ contract, employeeSign, employerSign }) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (c) => chunks.push(c));

  doc.pipe(stream);

  // ===== 폰트 =====
  if (fs.existsSync(fontPath)) {
    doc.registerFont("Korean", fontPath);
    doc.font("Korean");
  } else {
    console.warn("⚠️ Korean font not found, fallback to Helvetica");
    doc.font("Helvetica");
  }

  // ===== 제목 =====
  doc.fontSize(18).text(contract.title || "근로 계약서", { align: "center" }).moveDown(2);

  // ===== 기본 정보 =====
  let y = drawTable(
    doc,
    [
      { label: "계약 ID", value: contract.contractId },
      { label: "고용주", value: `${contract.employer?.name} (${contract.employer?.address})` },
      { label: "근로자", value: `${contract.employee?.name} (${contract.employee?.address})` },
    ],
    50,
    doc.y,
    150,
    350
  );

  doc.moveDown(2);

  // ===== 계약 기간 =====
  doc.fontSize(14).text("계약 기간", { underline: true }).moveDown(0.5);
  y = drawTable(
    doc,
    [
      { label: "시작일", value: contract.docJson?.contractPeriod?.startDate || "" },
      { label: "종료일", value: contract.docJson?.contractPeriod?.endDate || "" },
    ],
    50,
    doc.y,
    150,
    350
  );

  doc.moveDown(2);

  // ===== 근무 조건 =====
  doc.fontSize(14).text("근무 조건", { underline: true }).moveDown(0.5);
  y = drawTable(
    doc,
    [
      { label: "근무 장소", value: contract.docJson?.workplace || "" },
      { label: "직무", value: contract.docJson?.jobDescription || "" },
      { label: "1일 근로시간", value: contract.docJson?.workingConditions?.workHoursPerDay || "" },
      { label: "주당 근무일", value: contract.docJson?.workingConditions?.workDaysPerWeek || "" },
      { label: "휴게시간", value: contract.docJson?.workingConditions?.restTime || "" },
      { label: "주휴일", value: contract.docJson?.workingConditions?.weeklyHoliday || "" },
      { label: "근무형태", value: contract.docJson?.workingConditions?.workType || "" },
    ],
    50,
    doc.y,
    150,
    350
  );

  doc.moveDown(2);

  // ===== 임금 =====
  doc.fontSize(14).text("임금", { underline: true }).moveDown(0.5);
  y = drawTable(
    doc,
    [
      { label: "임금 형태", value: contract.docJson?.wage?.type || "" },
      { label: "금액", value: `${contract.docJson?.wage?.amount || ""} 원` },
      { label: "지급일", value: contract.docJson?.wage?.paymentDate || "" },
      { label: "지급 방법", value: contract.docJson?.wage?.paymentMethod || "" },
    ],
    50,
    doc.y,
    150,
    350
  );

  doc.moveDown(2);

  // ===== 휴가 & 4대보험 =====
  doc.fontSize(14).text("휴가 및 보험", { underline: true }).moveDown(0.5);
  y = drawTable(
    doc,
    [
      { label: "휴가", value: contract.docJson?.vacation || "" },
      { label: "보험", value: (contract.docJson?.insurances || []).join(", ") },
    ],
    50,
    doc.y,
    150,
    350
  );

  doc.moveDown(2);

  // ===== 해지 조항 =====
  doc.fontSize(14).text("계약 해지", { underline: true }).moveDown(0.5);
  y = drawTable(
    doc,
    [{ label: "해지 사유", value: contract.docJson?.termination || "" }],
    50,
    doc.y,
    150,
    350
  );

  doc.moveDown(2);

  // ===== 서명 =====
  doc.fontSize(14).text("전자 서명", { underline: true }).moveDown(1);

  if (employeeSign?.signBlob?.startsWith("data:image/")) {
    const base64 = employeeSign.signBlob.split(",")[1];
    const buf = Buffer.from(base64, "base64");
    doc.text("근로자 서명:").image(buf, { fit: [200, 80] });
  }

  doc.moveDown(1);

  if (employerSign?.signBlob?.startsWith("data:image/")) {
    const base64 = employerSign.signBlob.split(",")[1];
    const buf = Buffer.from(base64, "base64");
    doc.text("고용주 서명:").image(buf, { fit: [200, 80] });
  }

  // 종료
  doc.end();
  await new Promise((resolve) => stream.on("end", resolve));
  return Buffer.concat(chunks);
}

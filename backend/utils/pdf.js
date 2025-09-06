import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export async function buildContractPdf({ contract, employeeSign, employerSign }) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (c) => chunks.push(c));

  doc.pipe(stream);

  // ===== 제목 =====
  doc.fontSize(18).text(contract.title || "근로 계약서", { align: "center" }).moveDown();

  // ===== 기본 정보 =====
  doc.fontSize(12).text(`계약 ID: ${contract.contractId}`);
  doc.text(`고용주: ${contract.employer?.name || ""} (${contract.employer?.address || ""})`);
  doc.text(`근로자: ${contract.employee?.name || ""} (${contract.employee?.address || ""})`).moveDown();

  // ===== 계약 본문 =====
  doc.text("계약 본문:", { underline: true });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11).text(JSON.stringify(contract.docJson, null, 2));
  doc.moveDown(1);

  // ===== OTP 인증 정보 =====
  const invite = contract.invites.find((i) => i.role === "EMPLOYEE");
  if (invite) {
    doc.fontSize(12).text("본인 인증 (OTP):", { underline: true }).moveDown(0.3);
    doc.fontSize(10).text(`OTP 인증 완료: ${invite.otpVerified ? "✅ YES" : "❌ NO"}`);
    if (invite.acceptedAt) {
      doc.text(`인증 시각: ${new Date(invite.acceptedAt).toLocaleString()}`);
    }
    if (invite.invitee?.name) {
      doc.text(`인증 사용자: ${invite.invitee.name}`);
    }
    doc.moveDown(1);
  }

  // ===== 서명 내역 =====
  doc.fontSize(12).text("전자 서명:", { underline: true }).moveDown(0.5);

  // 근로자 서명
  if (employeeSign?.signType === "DRAWN" && employeeSign.signBlob?.startsWith("data:image/")) {
    const data = employeeSign.signBlob.split(",")[1];
    const buf = Buffer.from(data, "base64");
    try {
      doc.text("근로자 서명:");
      doc.image(buf, { fit: [200, 80] });
    } catch {
      doc.text("근로자 서명 이미지 삽입 실패");
    }
  } else if (employeeSign?.signType === "WALLET") {
    doc.text(`근로자 전자서명 (지갑): ${employeeSign.sig || "N/A"}`);
  } else {
    doc.text(`근로자 전자서명: ${employeeSign?.signType || "N/A"}`);
  }

  doc.moveDown(0.5);

  // 고용주 서명
  if (employerSign?.signType === "DRAWN" && employerSign.signBlob?.startsWith("data:image/")) {
    const data = employerSign.signBlob.split(",")[1];
    const buf = Buffer.from(data, "base64");
    try {
      doc.text("고용주 서명:");
      doc.image(buf, { fit: [200, 80] });
    } catch {
      doc.text("고용주 서명 이미지 삽입 실패");
    }
  } else if (employerSign?.signType === "WALLET") {
    doc.text(`고용주 전자서명 (지갑): ${employerSign.sig || "N/A"}`);
  } else {
    doc.text(`고용주 전자서명: ${employerSign?.signType || "N/A"}`);
  }

  // ===== 최종 상태 =====
  doc.moveDown(2);
  doc.fontSize(12).text(`계약 상태: ${contract.status}`);

  doc.end();
  await new Promise((resolve) => stream.on("end", resolve));
  return Buffer.concat(chunks);
}

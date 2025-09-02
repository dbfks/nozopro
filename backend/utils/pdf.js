import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export async function buildContractPdf({ contract, employeeSign, employerSign }) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", c => chunks.push(c));

  doc.pipe(stream);
  doc.fontSize(18).text(contract.title || "근로 계약서", { align: "center" }).moveDown();

  doc.fontSize(12).text(`계약ID: ${contract.contractId}`);
  doc.text(`고용주: ${contract.employer?.name || ""} (${contract.employer?.address || ""})`);
  doc.text(`근로자: ${contract.employee?.name || ""} (${contract.employee?.address || ""})`).moveDown();

  doc.text("본문:", { underline: true });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11).text(JSON.stringify(contract.docJson, null, 2));

  doc.moveDown();
  doc.text("서명:", { underline: true }).moveDown(0.5);

  if (employeeSign?.signType === "DRAWN" && typeof employeeSign.signBlob === "string" && employeeSign.signBlob.startsWith("data:image/")) {
    const data = employeeSign.signBlob.split(",")[1];
    const buf = Buffer.from(data, "base64");
    try { doc.text("근로자 서명:"); doc.image(buf, { fit: [200, 80] }); } catch {}
  } else {
    doc.text(`근로자 전자서명: ${employeeSign?.signType || "N/A"}`);
  }

  doc.moveDown(0.5);
  if (employerSign?.signType === "DRAWN" && typeof employerSign.signBlob === "string" && employerSign.signBlob.startsWith("data:image/")) {
    const data = employerSign.signBlob.split(",")[1];
    const buf = Buffer.from(data, "base64");
    try { doc.text("고용주 서명:"); doc.image(buf, { fit: [200, 80] }); } catch {}
  } else {
    doc.text(`고용주 전자서명: ${employerSign?.signType || "N/A"}`);
  }

  doc.end();
  await new Promise(resolve => stream.on("end", resolve));
  return Buffer.concat(chunks);
}

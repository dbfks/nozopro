// ESM 환경에서 샘플 PDF 생성
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { buildContractPdf } from "../backend/utils/pdf.js";

const outDir = resolve("artifacts");
mkdirSync(outDir, { recursive: true });

const sample = {
  contract: {
    employer: { name: "Acme HR" },
    employee: { name: "홍길동" },
    docJson: {
      contractPeriod: { startDate: "2025-10-01", endDate: "2026-09-30" },
      workplace: "서울시 어딘가 123",
      jobDescription: "개발 및 유지보수",
      workingConditions: {
        workHoursPerDay: 8,
        restTime: "12:00~13:00",
        workDaysPerWeek: 5,
        weeklyHoliday: "일요일",
        workType: "상용직"
      },
      wage: { type: "월급", amount: 3000000, paymentDate: "매월 25일", paymentMethod: "계좌이체" },
      insurances: ["고용보험", "산재보험", "국민연금", "건강보험"],
      employer: { company: "Acme HR", address: "서울시…", phone: "02-123-4567" },
      employee: { address: "서울시…", phone: "010-0000-0000" },
      signedDate: "2025-10-14"
    }
  },
  employeeSign: {},
  employerSign: {}
};

try {
  const buf = await buildContractPdf(sample);
  // 파일이 열려있어 EBUSY가 날 경우를 피하기 위해 타임스탬프 파일명 사용
  const out = resolve(outDir, `contract-preview-${Date.now()}.pdf`);
  writeFileSync(out, buf);
  console.log("PDF 생성 완료:", out);
} catch (e) {
  console.error(e);
  process.exit(1);
}



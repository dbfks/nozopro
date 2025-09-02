// backend/routes/contracts.js
import { Router } from "express";
import Contract from "../models/Contract.js";
const router = Router();

// 요청 로거
router.use((req, _res, next) => {
    console.log("[contracts]", req.method, req.originalUrl, req.query);
    next();
  });
  
  // 헬스체크(핑)
  router.get("/_ping", (req, res) => res.json({ ok: true }));  

// 생성
router.post("/", async (req, res) => {
  try {
    const doc = await Contract.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 단건 조회(디비 id 또는 contractId 둘 다 지원)
router.get("/:id", async (req, res) => {
  const q = [{ _id: req.params.id }, { contractId: req.params.id }];
  const doc = await Contract.findOne({ $or: q });
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

// 목록 조회 + 필터
router.get("/", async (req, res) => {
  const {
    q,                       // 텍스트 검색(title)
    employer, employee,      // 주소
    status,                  // 상태
    from, to,                // 기간(createdAt)
    page = 1, size = 10,
  } = req.query;

  const filter = {};
  if (employer) filter["employer.address"] = employer;
  if (employee) filter["employee.address"] = employee;
  if (status) filter.status = status;
  if (from || to) filter.createdAt = {
    ...(from ? { $gte: new Date(from) } : {}),
    ...(to ? { $lte: new Date(to) } : {}),
  };
  let query = Contract.find(filter).sort({ createdAt: -1 });
  if (q) query = query.find({ $text: { $search: q } });

  const skip = (Number(page) - 1) * Number(size);
  const [items, total] = await Promise.all([
    query.skip(skip).limit(Number(size)),
    Contract.countDocuments(q ? { ...filter, $text: { $search: q } } : filter),
  ]);
  res.json({ items, total, page: Number(page), size: Number(size) });
});

// 상태 변경(서명/승인/반려 등)
router.patch("/:id/status", async (req, res) => {
  const { action, by, txHash, note } = req.body; // action 예: SIGNED_EMP, APPROVED, REJECTED
  const doc = await Contract.findOneAndUpdate(
    { $or: [{ _id: req.params.id }, { contractId: req.params.id }] },
    {
      $set: { status: action === "REJECTED" ? "REJECTED" : action },
      $push: { timeline: { action, by, txHash, note } },
      ...(txHash ? { $set: { "onChain.lastTxHash": txHash } } : {}),
    },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

export { router }; 
export default router;

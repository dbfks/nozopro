// src/pages/ContractList.jsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const user = JSON.parse(localStorage.getItem("user"));

  const loadContracts = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const params = {};
      if (filter !== "ALL") params.status = filter;
      if (user.role === "EMPLOYER") params.employer = user.walletAddress;
      if (user.role === "WORKER") params.employee = user.walletAddress;

      const res = await axios.get("/api/contracts", { params });
      setContracts(res.data.items || []);
    } catch (err) {
      console.error("loadContracts error:", err);
      alert("계약 조회 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>내 계약 목록</h2>

      {/* 상태 필터 */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setFilter("ALL")} disabled={filter === "ALL"}>
          전체
        </button>
        <button onClick={() => setFilter("APPROVED")} disabled={filter === "APPROVED"}>
          진행중(Approved)
        </button>
        <button onClick={() => setFilter("ACCEPTED")} disabled={filter === "ACCEPTED"}>
          승인대기(Accepted)
        </button>
        <button onClick={() => setFilter("DRAFT")} disabled={filter === "DRAFT"}>
          작성중(Draft)
        </button>
      </div>

      {loading && <p>불러오는 중...</p>}
      {!loading && contracts.length === 0 && <p>계약 없음</p>}

      {/* 계약 리스트 */}
      {contracts.map((c) => (
        <div
          key={c._id}
          style={{
            border: "1px solid #ddd",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "6px",
          }}
        >
          <p><b>계약ID:</b> {c.contractId}</p>
          <p><b>상태:</b> {c.status}</p>
          <p><b>고용주:</b> {c.employer?.name} ({c.employer?.address})</p>
          <p><b>근로자:</b> {c.employee?.name} ({c.employee?.address})</p>

          {/* 계약서 보기 */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <a href={`/ui/contracts/${c.contractId}/view`}>계약서 보기</a>
            {c.status === "APPROVED" && c.final?.ipfsCid && (
              <a href={`https://ipfs.io/ipfs/${c.final.ipfsCid}`} target="_blank" rel="noreferrer">PDF 다운로드</a>
            )}
          </div>

          {/* Approved 계약은 고용주/근로자 모두 출퇴근 기록 열람 가능 */}
          {c.status === "APPROVED" && (
            <a href={`/ui/timesheet/${c.contractId}`}>출퇴근 기록 보기</a>
          )}
        </div>
      ))}
    </div>
  );
}

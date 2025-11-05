// src/pages/CareerHistory.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { etherscanTxUrl } from "../utils/etherscan";
import "./CareerHistory.css";

export default function CareerHistory() {
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user || (user.role !== "WORKER" && user.role !== "EMPLOYEE")) {
      alert("근로자만 조회할 수 있습니다.");
      window.location.href = "/ui/contracts/list";
      return;
    }
    loadCareers();
  }, []);

  const loadCareers = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/contracts/expired/${user.walletAddress}`);
      setCareers(res.data.careers || []);
    } catch (err) {
      console.error("경력 조회 실패:", err);
      alert("경력 조회 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}.${month}.${day}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="career-history-container">
        <div className="loading-state">⏳ 경력을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="career-history-container">
      <div className="career-history-header">
        <h1 className="career-history-title">경력 조회</h1>
        <p className="career-history-subtitle">만료된 계약을 경력으로 조회합니다</p>
      </div>

      {careers.length === 0 ? (
        <div className="empty-state">
          <p>등록된 경력이 없습니다.</p>
        </div>
      ) : (
        <div className="career-list">
          {careers.map((career, index) => {
            const txHash = career.contractData?.final?.txHash || career.contractData?.onChain?.lastTxHash;
            const handleCardClick = () => {
              if (txHash) {
                window.open(etherscanTxUrl(txHash), '_blank');
              } else {
                alert("이 계약의 블록체인 트랜잭션 정보가 없습니다.");
              }
            };

            return (
              <div 
                key={career.careerId} 
                className={`career-card ${txHash ? 'career-card-clickable' : ''}`}
                onClick={txHash ? handleCardClick : undefined}
                title={txHash ? "클릭하여 Etherscan에서 트랜잭션 확인" : ""}
              >
                <div className="career-number">경력 {index + 1}</div>
                <div className="career-content">
                  <div className="career-row">
                    <span className="career-label">회사명/직책:</span>
                    <span className="career-value">
                      {career.employerName} {career.position}
                    </span>
                  </div>
                  <div className="career-row">
                    <span className="career-label">근무기간:</span>
                    <span className="career-value">
                      {formatDate(career.startDate)} ~ {formatDate(career.endDate)}
                    </span>
                  </div>
                  {txHash && (
                    <div className="career-row">
                      <span className="career-label">블록체인:</span>
                      <span className="career-value career-value-link">
                        트랜잭션 확인하기 →
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


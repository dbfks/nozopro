import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInviteNotifications, acceptContract } from "../services/contracts";
import ContractPreview from "../components/ContractPreview";

export default function InviteHistory() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, ACCEPTED, EXPIRED
  const user = JSON.parse(localStorage.getItem("user"));

  const loadInviteHistory = async () => {
    if (!user || user.role !== "EMPLOYEE") {
      setError("근로자만 접근 가능합니다.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getInviteNotifications(user.walletAddress);
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error("초대 히스토리 조회 실패:", err);
      setError("초대 히스토리 조회 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInviteHistory();
  }, []);

  // 새로고침 없이 리스트 자동 갱신 (15초)
  useEffect(() => {
    if (!user || user.role !== "EMPLOYEE") return;
    let timerId;
    let isActive = true;

    const tick = async () => {
      if (!isActive) return;
      try {
        const res = await getInviteNotifications(user.walletAddress);
        setNotifications(res.notifications || []);
      } catch (e) {
        // silent
      }
    };

    const handleVisibility = () => {
      isActive = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    timerId = setInterval(tick, 15000);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timerId);
    };
  }, [user]);

  const handleAcceptInvite = async (notification) => {
    try {
      await acceptContract(notification.contractId, {
        inviteId: notification.inviteId
      });
      alert("✅ 초대를 수락했습니다!");
      // 히스토리 새로고침
      loadInviteHistory();
    } catch (err) {
      console.error("초대 수락 실패:", err);
      alert("초대 수락 실패: " + (err.response?.data?.error || err.message));
    }
  };

  const handleViewContract = (notification) => {
    navigate(`/ui/contracts/${notification.contractId}/accept?inviteId=${notification.inviteId}`);
  };

  const getStatusBadge = (notification) => {
    const now = new Date();
    const expiresAt = new Date(notification.expiresAt);
    
    if (expiresAt < now) {
      return { text: "만료됨", color: "#ef4444", bg: "#fef2f2" };
    }
    
    // 여기서는 PENDING 상태만 표시 (실제로는 서버에서 상태 확인 필요)
    return { text: "대기중", color: "#f59e0b", bg: "#fffbeb" };
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "ALL") return true;
    if (filter === "PENDING") return true; // 현재는 모두 PENDING
    return false;
  });

  if (loading) return <p>⏳ 불러오는 중...</p>;
  if (error) return <p style={{ color: "crimson" }}>오류: {error}</p>;
  if (!user || user.role !== "EMPLOYEE") {
    return <p style={{ color: "crimson" }}>근로자만 접근 가능합니다.</p>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <h1>초대 히스토리</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        받은 계약 초대를 확인하고 관리할 수 있습니다.
      </p>

      {/* 필터 탭 */}
      <div style={{ marginBottom: 24, display: "flex", gap: 8 }}>
        <button
          onClick={() => setFilter("ALL")}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: filter === "ALL" ? "#3b82f6" : "white",
            color: filter === "ALL" ? "white" : "#374151",
            cursor: "pointer"
          }}
        >
          전체 ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("PENDING")}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: filter === "PENDING" ? "#3b82f6" : "white",
            color: filter === "PENDING" ? "white" : "#374151",
            cursor: "pointer"
          }}
        >
          대기중 ({notifications.filter(n => getStatusBadge(n).text === "대기중").length})
        </button>
      </div>

      {/* 초대 목록 */}
      {filteredNotifications.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          background: "#f9fafb",
          borderRadius: 8,
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ color: "#6b7280", margin: 0 }}>
            {filter === "ALL" ? "받은 초대가 없습니다." : "해당 상태의 초대가 없습니다."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {filteredNotifications.map((notification, index) => {
            const status = getStatusBadge(notification);
            return (
              <div
                key={notification.inviteId}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 20,
                  background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#1f2937" }}>
                      {notification.contractTitle}
                    </h3>
                    <p style={{ margin: "0 0 4px 0", color: "#6b7280" }}>
                      고용주: {notification.employer.name || "이름 없음"}
                    </p>
                    <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: 14 }}>
                      계약 ID: {notification.contractId}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        color: status.color,
                        background: status.bg
                      }}
                    >
                      {status.text}
                    </span>
                    {notification.expiresAt && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        만료: {new Date(notification.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 액션 버튼들 */}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button
                    onClick={() => handleViewContract(notification)}
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500
                    }}
                  >
                    📋 계약서 보기
                  </button>
                  
                  {status.text === "대기중" && (
                    <button
                      onClick={() => handleAcceptInvite(notification)}
                      style={{
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      ✅ 수락하기
                    </button>
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

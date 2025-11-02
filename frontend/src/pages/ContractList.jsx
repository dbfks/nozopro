// src/pages/ContractList.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { getInviteNotifications } from "../services/contracts";
import InviteNotification from "../components/InviteNotification";
import { ipfsGatewayUrl } from "../utils/ipfs";

export default function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [notifications, setNotifications] = useState([]);
  const [showInviteNotification, setShowInviteNotification] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const loadContracts = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const params = {};
      if (filter !== "ALL") params.status = filter;
      
      // 고용주: 자신이 작성한 계약들 (employer.address로 필터링)
      if (user.role === "EMPLOYER") {
        params.employer = user.walletAddress;
      }
      // 근로자: 자신에게 초대된 계약들 (employee.address로 필터링)
      else if (user.role === "WORKER") {
        params.employee = user.walletAddress;
      }

      const res = await axios.get("/api/contracts", { params });
      setContracts(res.data.items || []);
    } catch (err) {
      console.error("loadContracts error:", err);
      alert("계약 조회 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadInviteNotifications = async () => {
    if (!user || user.role !== "WORKER") return;
    try {
      const res = await getInviteNotifications(user.walletAddress);
      if (res.notifications && res.notifications.length > 0) {
        setNotifications(res.notifications);
        setShowInviteNotification(true);
      }
    } catch (err) {
      console.error("초대 알림 조회 실패:", err);
    }
  };

  useEffect(() => {
    loadContracts();
    loadInviteNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // 계약 목록 10초 폴링
  useEffect(() => {
    const itv = setInterval(() => {
      loadContracts();
    }, 10000);
    return () => clearInterval(itv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user?.walletAddress, user?.role]);

  // 새로고침 없이 초대 알림 자동 갱신 (15초마다)
  useEffect(() => {
    if (!user || user.role !== "EMPLOYEE") return;

    let timerId;
    let isActive = true;

    const tick = async () => {
      if (!isActive) return;
      try {
        const res = await getInviteNotifications(user.walletAddress);
        const newList = res.notifications || [];
        // 이전보다 개수가 늘었으면 팝업 자동 노출
        if (newList.length > notifications.length) {
          setShowInviteNotification(true);
        }
        setNotifications(newList);
      } catch (e) {
        // ignore transient errors
      }
    };

    // 페이지 가시성에 따라 폴링 중지/재개
    const handleVisibility = () => {
      isActive = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 즉시 1회 실행 후 주기 실행
    tick();
    timerId = setInterval(tick, 15000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timerId);
    };
  }, [user, notifications.length]);

  const handleAcceptInvite = async (notification) => {
    try {
      // 초대 수락 API 호출
      await axios.post(`/api/contracts/${notification.contractId}/accept`, {
        inviteId: notification.inviteId
      });
      setShowInviteNotification(false);
      setNotifications([]);
      // 계약 목록 새로고침
      loadContracts();
    } catch (err) {
      console.error("초대 수락 실패:", err);
      alert("초대 수락 실패: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>내 계약 목록</h2>
        
        {/* 근로자용 초대 히스토리 링크 */}
        {user?.role === "EMPLOYEE" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a
              href="/ui/invite-history"
              style={{
                background: "#f59e0b",
                color: "white",
                padding: "8px 16px",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              초대 히스토리
              {notifications.length > 0 && (
                <span style={{
                  background: "#ef4444",
                  color: "white",
                  borderRadius: "50%",
                  padding: "2px 6px",
                  fontSize: 12,
                  fontWeight: 600,
                  minWidth: 18,
                  textAlign: "center"
                }}>
                  {notifications.length}
                </span>
              )}
            </a>
          </div>
        )}
      </div>
      
      {/* 초대 알림 팝업 */}
      {showInviteNotification && (
        <InviteNotification
          notifications={notifications}
          onClose={() => setShowInviteNotification(false)}
          onAccept={handleAcceptInvite}
        />
      )}

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
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <a href={`/ui/contracts/${c.contractId}/view`}>계약서 보기</a>
            
            {/* DRAFT 상태일 때 수정/초대 버튼 */}
            {c.status === "DRAFT" && user?.role === "EMPLOYER" && (
              <>
                <a 
                  href={`/ui/contracts/${c.contractId}/edit`}
                  style={{
                    background: "#f59e0b",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: 4,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  계약 수정하기
                </a>
                <a 
                  href={`/ui/contracts/${c.contractId}/invite`}
                  style={{
                    background: "#10b981",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: 4,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  근로자 초대하기
                </a>
              </>
            )}
            
            {/* APPROVED 상태일 때 PDF 다운로드 */}
            {c.status === "APPROVED" && c.final?.ipfsCid && (
              <a 
                href={ipfsGatewayUrl(c.final.ipfsCid)} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  background: "#3b82f6",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                PDF 다운로드
              </a>
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

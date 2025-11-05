// src/pages/ContractList.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { getInviteNotifications } from "../services/contracts";
import InviteNotification from "../components/InviteNotification";
import { ipfsGatewayUrl } from "../utils/ipfs";
import "./ContractList.css";

export default function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [showHidden, setShowHidden] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showInviteNotification, setShowInviteNotification] = useState(false);
  const [editingContractId, setEditingContractId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));

  const loadContracts = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const params = {};
      if (filter !== "ALL") params.status = filter;
      if (showHidden) params.showHidden = "true";
      params.userAddress = user.walletAddress;
      params.userRole = user.role;
      
      // 고용주: 자신이 작성한 계약들 (employer.address로 필터링)
      if (user.role === "EMPLOYER") {
        params.employer = user.walletAddress;
      }
      // 근로자: 자신에게 초대된 계약들 (employee.address로 필터링)
      else if (user.role === "WORKER" || user.role === "EMPLOYEE") {
        params.employee = user.walletAddress;
      }

      // 캐시 방지를 위해 타임스탬프 추가 및 헤더 설정
      const res = await axios.get("/api/contracts", { 
        params: {
          ...params,
          _t: Date.now() // 캐시 방지를 위한 타임스탬프
        },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      setContracts(res.data.items || []);
    } catch (err) {
      console.error("loadContracts error:", err);
      alert("계약 조회 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadInviteNotifications = async () => {
    if (!user || (user.role !== "WORKER" && user.role !== "EMPLOYEE")) return;
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
  }, [filter, showHidden]);

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


  const handleToggleHidden = async (contractId, e) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    if (!user) return;
    
    try {
      await axios.post(`/api/contracts/${contractId}/toggle-hidden`, {
        address: user.walletAddress,
        role: user.role
      });
      loadContracts(); // 목록 다시 불러오기
    } catch (err) {
      console.error("숨기기 토글 실패:", err);
      alert("숨기기 처리 실패: " + (err.response?.data?.error || err.message));
    }
  };

  const isContractHidden = (contract) => {
    if (!user || !contract.hiddenBy) return false;
    return contract.hiddenBy.some(
      h => h.address.toLowerCase() === user.walletAddress.toLowerCase() && h.role === user.role
    );
  };

  // 계약의 커스텀 이름 가져오기 (없으면 기본 title 반환)
  const getContractDisplayName = (contract) => {
    if (!user || !contract.customNames) return contract.title || "계약서";
    const customName = contract.customNames.find(
      cn => cn.address.toLowerCase() === user.walletAddress.toLowerCase() && cn.role === user.role
    );
    return customName?.customName || contract.title || "계약서";
  };

  // 계약 이름 편집 시작
  const handleStartEdit = (contract, e) => {
    e.stopPropagation();
    const currentName = getContractDisplayName(contract);
    setEditingContractId(contract.contractId || contract._id);
    setEditingName(currentName);
  };

  // 계약 이름 편집 취소
  const handleCancelEdit = () => {
    setEditingContractId(null);
    setEditingName("");
  };

  // 계약 이름 저장
  const handleSaveName = async (contractId, e) => {
    e?.stopPropagation();
    if (!user || !editingName.trim()) {
      handleCancelEdit();
      return;
    }

    try {
      await axios.post(`/api/contracts/${contractId}/update-name`, {
        address: user.walletAddress,
        role: user.role,
        customName: editingName.trim()
      });
      setEditingContractId(null);
      setEditingName("");
      loadContracts(); // 목록 새로고침
    } catch (err) {
      console.error("이름 저장 실패:", err);
      alert("이름 저장 실패: " + (err.response?.data?.error || err.message));
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      DRAFT: { label: "작성중", class: "status-draft" },
      INVITED: { label: "초대됨", class: "status-draft" },
      ACCEPTED: { label: "승인대기", class: "status-accepted" },
      PENDING_SIGN: { label: "서명대기", class: "status-accepted" },
      SIGNED_EMP: { label: "근로자 서명완료", class: "status-accepted" },
      SIGNED_BOTH: { label: "서명완료", class: "status-accepted" },
      APPROVED: { label: "진행중", class: "status-approved" },
    };
    return statusMap[status] || { label: status, class: "status-draft" };
  };

  return (
    <div className="contract-list-container">
      <div className="contract-list-header">
        <h2>내 계약 목록</h2>
        
        {/* 근로자용 초대 히스토리 링크 */}
        {user?.role === "EMPLOYEE" && (
          <a
            href="/ui/invite-history"
            className="invite-history-btn"
          >
            초대 히스토리
            {notifications.length > 0 && (
              <span className="invite-badge">{notifications.length}</span>
            )}
          </a>
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
      <div className="filter-buttons">
        <button 
          className={`filter-btn ${filter === "ALL" ? "active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          전체
        </button>
        <button 
          className={`filter-btn ${filter === "APPROVED" ? "active" : ""}`}
          onClick={() => setFilter("APPROVED")}
        >
          진행중
        </button>
        <button 
          className={`filter-btn ${filter === "ACCEPTED" ? "active" : ""}`}
          onClick={() => setFilter("ACCEPTED")}
        >
          승인대기
        </button>
        <button 
          className={`filter-btn ${filter === "DRAFT" ? "active" : ""}`}
          onClick={() => setFilter("DRAFT")}
        >
          작성중
        </button>
        <button 
          className={`filter-btn ${showHidden ? "active" : ""}`}
          onClick={() => setShowHidden(!showHidden)}
          style={{ marginLeft: "auto" }}
        >
          {showHidden ? "일반 계약" : "숨긴 계약"}
        </button>
      </div>

      {loading && (
        <div className="loading-state">불러오는 중...</div>
      )}

      {!loading && contracts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <div className="empty-state-text">계약이 없습니다</div>
        </div>
      )}

      {!loading && contracts.length > 0 && (
        <div className="contracts-list">
          {contracts.map((c, index) => {
            const statusInfo = getStatusInfo(c.status);
            return (
              <div 
                key={c._id} 
                className="contract-card-content"
                onClick={() => window.location.href = `/ui/contracts/${c.contractId}/view`}
              >
                <div className={`contract-status-badge ${statusInfo.class}`}>
                  {statusInfo.label}
                </div>
                
                <div className="contract-card-header">
                  <div className="contract-title-section">
                    {editingContractId === (c.contractId || c._id) ? (
                      <div className="contract-title-edit">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={(e) => handleSaveName(c.contractId || c._id, e)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveName(c.contractId || c._id, e);
                            } else if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="contract-name-input"
                          autoFocus
                          maxLength={100}
                        />
                        <div className="contract-name-actions">
                          <button
                            className="contract-name-btn save"
                            onClick={(e) => handleSaveName(c.contractId || c._id, e)}
                            title="저장 (Enter)"
                          >
                            ✓
                          </button>
                          <button
                            className="contract-name-btn cancel"
                            onClick={handleCancelEdit}
                            title="취소 (Esc)"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="contract-title-wrapper">
                        <div 
                          className="contract-title"
                          onDoubleClick={(e) => handleStartEdit(c, e)}
                          title="더블클릭하여 이름 변경"
                        >
                          {getContractDisplayName(c)}
                        </div>
                        <button
                          className="contract-edit-name-btn"
                          onClick={(e) => handleStartEdit(c, e)}
                          title="이름 변경"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                    <div className="contract-id">
                      {c.contractId}
                    </div>
                  </div>
                </div>

                    <div className="contract-info">
                      <div className="info-row">
                        <div className="info-label">고용주</div>
                        <div className="info-value">{c.employer?.name || "미지정"}</div>
                        <div className="info-value-small">{c.employer?.address}</div>
                      </div>

                      <div className="info-row">
                        <div className="info-label">근로자</div>
                        <div className="info-value">{c.employee?.name || "미지정"}</div>
                        <div className="info-value-small">{c.employee?.address}</div>
                      </div>

                      {c.createdAt && (
                        <div className="info-row">
                          <div className="info-label">생성일</div>
                          <div className="info-value">
                            {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                          </div>
                        </div>
                      )}
                    </div>

                <div className="contract-actions">
                  <div className="action-btn-group" onClick={(e) => e.stopPropagation()}>
                    {/* DRAFT 상태일 때 수정/초대 버튼 */}
                    {c.status === "DRAFT" && user?.role === "EMPLOYER" && (
                      <>
                        <a 
                          href={`/ui/contracts/${c.contractId}/edit`}
                          className="action-btn action-btn-secondary action-btn-small"
                        >
                          수정
                        </a>
                        <a 
                          href={`/ui/contracts/${c.contractId}/invite`}
                          className="action-btn action-btn-primary action-btn-small"
                        >
                          초대
                        </a>
                      </>
                    )}
                    
                    {/* APPROVED 상태일 때 PDF 다운로드 */}
                    {c.status === "APPROVED" && c.final?.ipfsCid && (
                      <a 
                        href={ipfsGatewayUrl(c.final.ipfsCid)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="action-btn action-btn-secondary action-btn-small"
                      >
                        PDF
                      </a>
                    )}

                    {/* Approved 계약은 고용주/근로자 모두 출퇴근 기록 열람 가능 */}
                    {c.status === "APPROVED" && (
                      <a 
                        href={`/ui/timesheet/${c.contractId}`}
                        className="action-btn action-btn-secondary action-btn-small"
                      >
                        근태기록
                      </a>
                    )}

                    {/* 숨기기/보이기 버튼 */}
                    <button
                      className="action-btn action-btn-secondary action-btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleHidden(c.contractId || c._id, e);
                      }}
                      style={{ 
                        background: showHidden ? "#10b981" : "rgba(255, 255, 255, 0.08)",
                        color: showHidden ? "#000000" : "#ffffff"
                      }}
                    >
                      {showHidden ? "보이기" : "숨기기"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

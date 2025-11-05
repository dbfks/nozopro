// src/pages/TimeEntryNotifications.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./TimeEntryNotifications.css";

export default function TimeEntryNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const isEmployer = user?.role === "EMPLOYER";
  const isWorker = user?.role === "WORKER" || user?.role === "EMPLOYEE";

  useEffect(() => {
    if (!user || (!isEmployer && !isWorker)) {
      alert("접근 권한이 없습니다.");
      navigate("/ui/contracts/list");
      return;
    }
    loadNotifications();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const apiPath = isEmployer 
        ? `/api/employer/time-entries/${user.walletAddress}`
        : `/api/worker/time-entries/${user.walletAddress}`;
      const res = await axios.get(apiPath);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("알림 조회 실패:", err);
      alert("알림 조회 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status, type, employeeName) => {
    if (isEmployer && status === "PENDING") {
      // 고용주는 "승인 요청되었습니다"로 표시
      return `${employeeName || "근로자"} ${type} 승인 요청되었습니다`;
    }
    // 근로자는 기존 텍스트 유지
    if (status === "PENDING") {
      return `${type} 승인대기 중입니다`;
    } else if (status === "APPROVED") {
      return `${type} 승인되었습니다`;
    } else if (status === "REJECTED") {
      return `${type} 거부되었습니다`;
    }
    return `${type} 처리 중`;
  };

  const formatDate = (dateStr) => {
    // YYYY-MM-DD 형식을 YYYY.MM.DD로 변환하거나 그대로 사용
    if (!dateStr) return "";
    return dateStr.replace(/-/g, ".");
  };

  const getStatusClass = (status) => {
    if (status === "PENDING") return "status-pending";
    if (status === "APPROVED") return "status-approved";
    if (status === "REJECTED") return "status-rejected";
    return "";
  };

  const handleNotificationClick = (notification) => {
    navigate(`/ui/timesheet/${notification.contractId}`);
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="time-entry-notifications-container">
        <div className="loading-state">⏳ 알림을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="time-entry-notifications-container">
      <div className="notifications-header">
        <h1 className="notifications-title">근태 기록 알림</h1>
        <button className="refresh-btn" onClick={loadNotifications}>
          새로고침
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p>알림이 없습니다.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${getStatusClass(notification.status)}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-content">
                <div className="notification-main">
                  <span className="notification-contract">[{notification.contractName}]</span>
                  <span className="notification-date">{formatDate(notification.date)}</span>
                  {isEmployer && notification.employeeName && (
                    <span className="notification-employee">{notification.employeeName}</span>
                  )}
                </div>
                <div className="notification-status">
                  {getStatusText(notification.status, notification.type, notification.employeeName)}
                </div>
              </div>
              <div className="notification-arrow">→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


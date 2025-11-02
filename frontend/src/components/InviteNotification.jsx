import React from "react";
import { useNavigate } from "react-router-dom";

export default function InviteNotification({ notifications, onClose, onAccept }) {
  const navigate = useNavigate();

  const handleAccept = async (notification) => {
    try {
      await onAccept(notification);
      // 초대 수락 후 계약서 확인 페이지로 이동
      navigate(`/ui/contracts/${notification.contractId}/accept?inviteId=${notification.inviteId}`);
    } catch (err) {
      console.error("초대 수락 실패:", err);
    }
  };

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          maxWidth: 500,
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: "#1f2937" }}>📋 계약 초대 알림</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: "#6b7280" }}>
            {notifications.length}개의 새로운 계약 초대가 있습니다.
          </p>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {notifications.map((notification, index) => (
            <div
              key={notification.inviteId}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 16,
                background: "#f9fafb",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: "#1f2937" }}>
                  {notification.contractTitle}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>
                  고용주: {notification.employer.name || "이름 없음"}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => handleAccept(notification)}
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  계약 확인하기
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  나중에
                </button>
              </div>

              {notification.expiresAt && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9ca3af" }}>
                  만료일: {new Date(notification.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

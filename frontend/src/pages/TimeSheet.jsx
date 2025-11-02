import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../styles/TimeSheet.css";

export default function TimeSheet() {
  const { id } = useParams();
  const [entries, setEntries] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEntries, setSelectedEntries] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
  const isWorker = user?.role === "EMPLOYEE";
  const isEmployer = user?.role === "EMPLOYER";

  const loadEntries = async () => {
    try {
      const res = await axios.get(`/api/entries/${id}`);
      setEntries(res.data.dbEntries || []);
    } catch (err) {
      console.error("loadEntries error:", err);
      alert("출퇴근 기록 불러오기 실패");
    }
  };

  const loadPendingEntries = async () => {
    if (!isEmployer) return;
    try {
      const res = await axios.get(`/api/pending-entries/${id}`);
      setPendingEntries(res.data.entries || []);
    } catch (err) {
      console.error("loadPendingEntries error:", err);
      alert("승인 대기 기록 불러오기 실패");
    }
  };

  const clockIn = async () => {
    try {
      const res = await axios.post("/api/clock-in", { id, walletAddress: user.walletAddress });
      alert(res.data.message || "출근 기록이 저장되었습니다. 고용주 승인을 기다리는 중입니다.");
      loadEntries();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "출근 실패";
      alert(`출근 실패: ${msg}`);
    }
  };

  const clockOut = async () => {
    try {
      const res = await axios.post("/api/clock-out", { id, walletAddress: user.walletAddress });
      alert(`${res.data.message}\n근무 시간: ${res.data.workHours}시간`);
      loadEntries();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "퇴근 실패";
      alert(`퇴근 실패: ${msg}`);
    }
  };

  const approveEntries = async () => {
    if (selectedEntries.length === 0) {
      alert("승인할 기록을 선택해주세요.");
      return;
    }

    try {
      const res = await axios.post("/api/approve-timesheet", {
        contractId: id,
        entryIds: selectedEntries
      });
      alert(res.data.message);
      setSelectedEntries([]);
      loadEntries();
      loadPendingEntries();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "승인 실패";
      alert(`승인 실패: ${msg}`);
    }
  };

  useEffect(() => {
    loadEntries();
    loadPendingEntries();
    // eslint-disable-next-line
  }, [id]);

  // 10초 폴링 (엔트리/대기목록)
  useEffect(() => {
    const tick = () => {
      loadEntries();
      loadPendingEntries();
    };
    const itv = setInterval(tick, 10000);
    return () => clearInterval(itv);
    // eslint-disable-next-line
  }, [id, isEmployer]);

  const todayEntry = entries.find(
    (e) => new Date(e.inTime).toDateString() === selectedDate.toDateString()
  );
  const todayStatus = todayEntry?.status || "PENDING"; // 기본값: 승인 대기

  const toggleEntrySelection = (entryId) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  return (
    <div className="timesheet-container">
      <h2>근무 시간 체크</h2>
      
      {/* 근로자용 출퇴근 버튼 */}
      {isWorker && (
        <div className="action-buttons">
          <button className="btn btn-in" onClick={clockIn}>출근</button>
          <button className="btn btn-out" onClick={clockOut}>퇴근</button>
        </div>
      )}

      {/* 고용주용 승인 대기 목록 */}
      {isEmployer && (
        <div className="pending-card">
          <div className="pending-header">
            <h3 style={{ margin: 0 }}>승인 대기 중인 출퇴근 기록</h3>
            <div className="pending-actions">
              <button 
                className="btn-approve"
                onClick={approveEntries}
                disabled={selectedEntries.length === 0}
              >
                선택한 기록 승인 ({selectedEntries.length}개)
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="pending-table">
              <thead>
                <tr>
                  <th style={{ width: 42 }}></th>
                  <th>출근</th>
                  <th>퇴근</th>
                  <th>근무시간</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {pendingEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, color: '#6b7280' }}>대기 중인 기록이 없습니다.</td>
                  </tr>
                ) : (
                  pendingEntries.map((entry) => (
                    <tr key={entry._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedEntries.includes(entry._id)}
                          onChange={() => toggleEntrySelection(entry._id)}
                        />
                      </td>
                      <td>{new Date(entry.inTime).toLocaleString()}</td>
                      <td>{entry.outTime ? new Date(entry.outTime).toLocaleString() : '-'}</td>
                      <td>{entry.workHours ? `${entry.workHours}시간` : '-'}</td>
                      <td>
                        <span className="status-badge status-pending">승인 대기</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Calendar value={selectedDate} onChange={setSelectedDate} />

      <div className="entry-info">
        {todayEntry ? (
          <>
            <p><b>출근:</b> {todayEntry.inTime ? new Date(todayEntry.inTime).toLocaleTimeString() : "없음"}</p>
            <p><b>퇴근:</b> {todayEntry.outTime ? new Date(todayEntry.outTime).toLocaleTimeString() : "없음"}</p>
            {todayEntry.workHours && (
              <p><b>근무시간:</b> {todayEntry.workHours}시간</p>
            )}
            <p><b>상태:</b> 
              <span style={{ 
                color: todayStatus === "APPROVED" ? "green" : 
                       todayStatus === "PENDING" ? "orange" : "red",
                marginLeft: 8
              }}>
                {todayStatus === "APPROVED" ? "승인됨" : 
                 todayStatus === "PENDING" ? "승인 대기" : "거부됨"}
              </span>
            </p>
          </>
        ) : (
          <p>기록 없음</p>
        )}
      </div>
    </div>
  );
}

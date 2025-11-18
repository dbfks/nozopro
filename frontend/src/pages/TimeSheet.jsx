import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./TimeSheet.css";
import BlockchainLoader from "../components/BlockchainLoader";

export default function TimeSheet() {
  const { id } = useParams();
  const [entries, setEntries] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [salaryData, setSalaryData] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
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
      setIsUploading(true);
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
    } finally {
      setIsUploading(false);
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

  // 날짜별 기록이 있는지 확인하는 함수
  const getEntryForDate = (date) => {
    return entries.find(
      (e) => new Date(e.inTime).toDateString() === date.toDateString()
    );
  };

  // 달력 타일에 클래스를 추가하는 함수
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const entry = getEntryForDate(date);
      if (entry) {
        const statusClass = entry.status?.toLowerCase() || 'pending';
        return `has-entry ${statusClass}`;
      }
    }
    return null;
  };

  // 요일을 한글로 표시
  const formatShortWeekday = (locale, date) => {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return weekdays[date.getDay()];
  };

  const toggleEntrySelection = (entryId) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  // 선택된 날짜의 월에 해당하는 총 근로 시간 계산
  const getMonthlyTotalHours = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const monthlyEntries = entries.filter(entry => {
      const entryDate = new Date(entry.inTime);
      return entryDate.getFullYear() === year && 
             entryDate.getMonth() === month &&
             entry.status === "APPROVED" &&
             entry.workHours;
    });
    
    const totalHours = monthlyEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
    return totalHours.toFixed(1);
  };

  // 급여 계산
  const calculateSalary = async () => {
    try {
      setLoadingSalary(true);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const walletAddress = isWorker ? user.walletAddress : undefined;
      
      const params = { year, month };
      if (walletAddress) params.walletAddress = walletAddress;
      
      const res = await axios.get(`/api/calculate-salary/${id}`, { params });
      setSalaryData(res.data);
    } catch (err) {
      console.error("급여 계산 실패:", err);
      alert("급여 계산 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoadingSalary(false);
    }
  };

  useEffect(() => {
    if (entries.length > 0) {
      calculateSalary();
    }
    // eslint-disable-next-line
  }, [selectedDate, entries.length]);

  return (
    <>
      {isUploading && (
        <BlockchainLoader message="출퇴근 기록을 블록체인에 업로드 중..." />
      )}
      
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

      <div className="calendar-section">
        <Calendar 
          value={selectedDate} 
          onChange={setSelectedDate}
          tileClassName={tileClassName}
          formatShortWeekday={formatShortWeekday}
        />
        <div className="monthly-summary">
          <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#ffffff" }}>
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 총 근로 시간
          </h3>
          <div className="total-hours-display">
            <span className="total-hours-value">{getMonthlyTotalHours()}</span>
            <span className="total-hours-unit">시간</span>
          </div>
          <p style={{ margin: "12px 0 0 0", fontSize: "14px", color: "rgba(255, 255, 255, 0.6)" }}>
            승인된 기록 기준
          </p>

          {/* 급여 계산 섹션 */}
          {salaryData && (
            <div style={{ 
              marginTop: "24px", 
              padding: "16px", 
              background: "rgba(16, 185, 129, 0.1)", 
              borderRadius: "8px",
              border: "1px solid rgba(16, 185, 129, 0.3)"
            }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#ffffff" }}>
                💰 급여 계산
              </h4>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)" }}>급여 유형: </span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                  {salaryData.wageType} {Number(salaryData.wageAmount).toLocaleString()}원
                </span>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)" }}>총 근무시간: </span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                  {salaryData.totalHours}시간
                </span>
              </div>
              <div style={{ 
                marginTop: "12px", 
                paddingTop: "12px", 
                borderTop: "1px solid rgba(16, 185, 129, 0.3)" 
              }}>
                <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>
                  계산식
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.9)" }}>
                  {salaryData.calculationDetail.calculation}
                </div>
              </div>
              <div style={{ 
                marginTop: "16px", 
                padding: "12px", 
                background: "rgba(255, 255, 255, 0.05)", 
                borderRadius: "6px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>
                  계산된 급여
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#10b981" }}>
                  {salaryData.calculatedSalary.toLocaleString()}원
                </div>
              </div>
            </div>
          )}
          
          {loadingSalary && (
            <div style={{ marginTop: "16px", textAlign: "center", color: "rgba(255, 255, 255, 0.6)" }}>
              급여 계산 중...
            </div>
          )}
        </div>
      </div>

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
    </>
  );
}

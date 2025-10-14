import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../styles/TimeSheet.css";

export default function TimeSheet() {
  const { id } = useParams();
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
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

  const clockIn = async () => {
    try {
      await axios.post("/api/clock-in", { id, walletAddress: user.walletAddress });
      alert("출근 성공!");
      loadEntries();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "출근 실패";
      alert(`출근 실패: ${msg}`);
    }
  };

  const clockOut = async () => {
    try {
      await axios.post("/api/clock-out", { id, walletAddress: user.walletAddress });
      alert("퇴근 성공!");
      loadEntries();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "퇴근 실패";
      alert(`퇴근 실패: ${msg}`);
    }
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line
  }, [id]);

  const todayEntry = entries.find(
    (e) => new Date(e.inTime).toDateString() === selectedDate.toDateString()
  );

  return (
    <div className="timesheet-container">
      <h2>근무 시간 체크</h2>
      <Calendar value={selectedDate} onChange={setSelectedDate} />

      <div className="entry-info">
        {todayEntry ? (
          <>
            <p><b>출근:</b> {todayEntry.inTime ? new Date(todayEntry.inTime).toLocaleTimeString() : "없음"}</p>
            <p><b>퇴근:</b> {todayEntry.outTime ? new Date(todayEntry.outTime).toLocaleTimeString() : "없음"}</p>
          </>
        ) : (
          <p>기록 없음</p>
        )}
      </div>

      {isWorker && (
        <div className="action-buttons">
          <button className="btn btn-in" onClick={clockIn}>출근</button>
          <button className="btn btn-out" onClick={clockOut}>퇴근</button>
        </div>
      )}
    </div>
  );
}

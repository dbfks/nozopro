import { useState } from 'react';
import api from '../services/api';

function formatKST(ts) {
  return new Date(ts * 1000).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function TimeSheet({ agreementId }) {
  const [msg, setMsg] = useState('');
  const [entries, setEntries] = useState({ clockIns:[], clockOuts:[] });

  const doClock = async (endpoint,label) => {
    setMsg(`${label} 중…`);
    const { data } = await api.post(endpoint, { id: agreementId });
    setMsg(`${label} 완료 tx: ${data.txHash}`);
  };

  const fetchEntries = async () => {
    setMsg('기록 조회 중…');
    try {
      const { data } = await api.get(`api/entries/${agreementId}`);
      setEntries(data);
      setMsg('기록 조회 완료');
    } catch (e) {
      setMsg(`조회 실패: ${e.response?.data?.error || e.message}`);
    }
  };

  return (
    <div>
      <h2>TimeSheet</h2>
      <button onClick={()=>doClock('api/clock-in','출근')}>출근</button>
      <button onClick={()=>doClock('api/clock-out','퇴근')}>퇴근</button>
      <button onClick={fetchEntries}>기록 조회</button>
      <p>{msg}</p>

      <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
        <div>
          <h3>출근 기록</h3>
          <ul>
            {entries.clockIns.map((ts, i) =>
              <li key={i}>{formatKST(ts)}</li>
            )}
          </ul>
        </div>
        <div>
          <h3>퇴근 기록</h3>
          <ul>
            {entries.clockOuts.map((ts, i) =>
              <li key={i}>{formatKST(ts)}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}


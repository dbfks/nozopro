// src/pages/ContractRegister.jsx
import React, { useState } from 'react';
import { uploadContractFile, registerContract } from '../services';

export default function ContractRegister() {
  const [file, setFile]     = useState(null);
  const [date, setDate]     = useState(new Date().toISOString().slice(0,10));
  const [time, setTime]     = useState(new Date().toISOString().slice(11,16));
  const [result, setResult] = useState({ loading: false, data: null, error: null });

  const onRegister = async () => {
    if (!file) return alert('파일을 선택하세요.');
    setResult({ loading: true, data: null, error: null });
    try {
      const { cid } = await uploadContractFile(file);
      const expiryTs = Math.floor(new Date(`${date}T${time}`).getTime()/1000);
      const data = await registerContract(cid, expiryTs);
      setResult({ loading:false, data, error:null });
    } catch (e) {
      setResult({ loading:false, data:null, error:e.message });
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>계약 등록</h2>

      {/* ─────── Grid 레이아웃 ─────── */}
      <div className="register-grid">
        {/* 1) 파일 업로드 */}
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          style={{ width: '100%' }}
        />

        {/* 2) 날짜 */}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ width: '100%' }}
        />

        {/* 3) 시간 */}
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          style={{ width: '100%' }}
        />

        {/* 4) 등록 버튼 */}
        <button
          onClick={onRegister}
          disabled={result.loading}
          style={{
            padding: '8px 16px',
            whiteSpace: 'nowrap'
          }}
        >
          {result.loading ? '등록중…' : '등록하기'}
        </button>
      </div>

      {/* 결과 메시지 영역 */}
{result.error && (
  <div
    className="result-message" style={{ color: 'red', marginTop: 8 }}
  >
    {result.error}
  </div>
)}

{result.data && (
  <div className="result-message" style={{ color: 'green', marginTop: 8 }}>
    등록 완료! ID: {result.data.id}, tx: {result.data.txHash}
  </div>
)}

    </div>
  );
}

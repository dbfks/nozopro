// src/pages/ContractSearch.jsx
import React, { useState } from 'react';
import { getContracts, signByEmployer, signByWorker, approveContract } from '../services/index';

export default function ContractSearch() {
  const [id, setId]         = useState('');
  const [message, setMessage] = useState(null);

  const handleAction = async (actionFn, label) => {
    if (!id) return alert('계약 ID를 입력하세요.');
    try {
      const { txHash } = await actionFn(Number(id));
      setMessage(`${label} 성공! 트랜잭션: ${txHash}`);
    } catch (e) {
      setMessage(`${label} 실패: ${e.message}`);
    }
  };

  const btnStyle = {
  flex: '0 0 auto',
  padding: '8px 12px',
  border: 'none',
  borderRadius: 4,
  background: '#007bff',
  color: '#fff',
  cursor: 'pointer'
};

  return (
    <div style={{
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginBottom: 16
}}>
      <h2>계약 조회 &amp; 서명/승인</h2>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input
    type="text"
    placeholder="계약 ID"
    style={{ flex: '1 1 100px', minWidth: '100px' }}
    value={id}
          onChange={e => { setId(e.target.value); setMessage(null); }}
        />
        <button style={btnStyle} onClick={() => handleAction(getContracts, '조회')}>조회</button>
        <button style={btnStyle} onClick={() => handleAction(signByEmployer, '고용주 서명')}>고용주 서명</button>
        <button style={btnStyle} onClick={() => handleAction(signByWorker, '근로자 서명')}>근로자 서명</button>
        <button style={btnStyle} onClick={() => handleAction(approveContract, '승인')}>승인</button>
</div>

      {message && (
        <div className="result-message"  style={{ color: message.includes('실패') ? 'red' : 'green' }}>
          {message}
        </div>
      )}
    </div>
  );
}

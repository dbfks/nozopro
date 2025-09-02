// src/pages/ApprovedContracts.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getContracts, clockIn, clockOut, getEntries } from '../services';

export default function ApprovedContracts() {
  // 계약 목록, 선택된 계약, 출퇴근 기록, 로딩 상태를 관리할 state
  const [contracts, setContracts]             = useState([]);
  const [selected, setSelected]               = useState(null);
  const [entries, setEntries]                 = useState({ in: [], out: [] });
  const [loadingList, setLoadingList]         = useState(false);
  const [loadingEntries, setLoadingEntries]   = useState(false);

  // 1) 계약 목록을 가져오는 함수 (useCallback으로 래핑)
  const fetchContracts = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getContracts();       // 백엔드에서 JSON 배열 가져오기
      setContracts(data);
      // 현재 선택된 계약이 새 목록에 없으면 선택 해제
      if (selected && !data.some(c => c.id === selected.id)) {
        setSelected(null);
      }
    } catch (e) {
      console.error('계약 목록 조회 실패', e);
    } finally {
      setLoadingList(false);
    }
  }, [selected]);

  // 컴포넌트 마운트 시 한 번 실행
  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // 2) 선택된 계약의 출퇴근 기록을 가져오는 함수
  const fetchEntries = useCallback(async () => {
    if (!selected) return;
    setLoadingEntries(true);
    try {
      const data = await getEntries(selected.id);  // 백엔드에서 기록 조회
      setEntries({ in: data.clockIns, out: data.clockOuts });
    } catch (e) {
      console.error('출퇴근 기록 조회 실패', e);
    } finally {
      setLoadingEntries(false);
    }
  }, [selected]);

  // selected가 바뀔 때마다 실행
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // 3) 출근/퇴근 버튼 핸들러
  const handleClock = async (type) => {
    if (!selected) return;
    try {
      if (type === 'in')  await clockIn(selected.id);
      else                 await clockOut(selected.id);
      // 기록이 추가되었으니 다시 조회
      fetchEntries();
    } catch (e) {
      alert(`출퇴근 기록 실패: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>승인된 계약목록</h2>

      {/* 계약 목록 새로고침 버튼 */}
      <button
        onClick={fetchContracts}
        disabled={loadingList}
        style={{ marginBottom: 12 }}
      >
        {loadingList ? '불러오는 중…' : '계약목록 새로고침'}
      </button>

      {/* 승인된 계약이 없을 때 */}
      {contracts.length === 0 ? (
        <div style={{ color: '#666', marginTop: 12 }}>
          승인된 계약이 없습니다.
        </div>
      ) : (
        /* 계약 버튼 리스트 */
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {contracts.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              style={{
                padding: '6px 12px',
                border:   selected?.id === c.id ? '2px solid #007bff' : '1px solid #ccc',
                background: selected?.id === c.id ? '#e6f0ff' : '#fff',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              계약 {c.id}
            </button>
          ))}
        </div>
      )}

      {/* 선택된 계약의 출퇴근 UI */}
      {selected && (
        <div>
          <h3>계약 {selected.id} 출퇴근</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button onClick={() => handleClock('in')}>출근</button>
            <button onClick={() => handleClock('out')}>퇴근</button>
            <button onClick={fetchEntries} disabled={loadingEntries}>
              {loadingEntries ? '조회중…' : '기록 조회'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <h4>출근 기록</h4>
              {entries.in.map((t, i) => (
                <div key={i}>{new Date(t * 1000).toLocaleString()}</div>
              ))}
            </div>
            <div>
              <h4>퇴근 기록</h4>
              {entries.out.map((t, i) => (
                <div key={i}>{new Date(t * 1000).toLocaleString()}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

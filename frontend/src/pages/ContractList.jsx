// // src/pages/ContractList.jsx
// import React, { useState, useEffect } from 'react';
// import '../App.css';

// export default function ContractList() {
//   const [contracts, setContracts] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // 실제 API 엔드포인트에 맞게 수정하세요
//     fetch('/api/contracts')
//       .then(res => res.json())
//       .then(data => {
//         setContracts(data);
//       })
//       .catch(err => {
//         console.error(err);
//         setContracts([]);
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   return (
//     <div className="container">
//       <section className="section">
//         <h2>계약 목록</h2>

//         {loading ? (
//           <div>불러오는 중…</div>
//         ) : contracts.length === 0 ? (
//           <div>등록된 계약이 없습니다.</div>
//         ) : (
//           <div className="grid-2">
//             {contracts.map((c) => (
//               <div className="card flex" key={c.id} style={{ justifyContent: 'space-between' }}>
//                 {/* 계약 정보 */}
//                 <div style={{ flex: 1, lineHeight: 1.5 }}>
//                   <div><strong>ID:</strong> {c.id}</div>
//                   <div><strong>파일명:</strong> {c.title || c.filename}</div>
//                   {c.employer && <div><strong>고용주:</strong> {c.employer}</div>}
//                   {c.employee && <div><strong>근로자:</strong> {c.employee}</div>}
//                   <div><strong>상태:</strong> {c.status}</div>
//                 </div>

//                 {/* 액션 버튼 */}
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
//                   {c.status === '대기' && (
//                     <button className="button">서명하기</button>
//                   )}
//                   <button className="button secondary">상세보기</button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </section>
//     </div>
//   );
// }

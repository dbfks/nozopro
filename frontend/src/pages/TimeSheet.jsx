// // src/pages/TimeSheet.jsx
// import React, { useState } from 'react';
// export default function TimeSheet() {
//   const [records, setRecords] = useState({ in:[], out:[] });
//   const add = (type) => {
//     setRecords(r => ({
//       ...r,
//       [type]: [...r[type], new Date().toLocaleString()]
//     }));
//   };
//   return (
//     <div>
//       <h2>TimeSheet</h2>
//       <div style={{ display:'flex', gap:8, marginBottom:12 }}>
//         <button onClick={()=>add('in')}>출근</button>
//         <button onClick={()=>add('out')}>퇴근</button>
//         <button onClick={()=>{/* TODO: 서버조회 */}}>기록 조회</button>
//       </div>
//       <div style={{ display:'flex', gap:32, marginTop:16 }}>
//         <div>
//           <h4>출근 기록</h4>
//           {records.in.map((t,i)=><div key={i}>{t}</div>)}
//         </div>
//         <div>
//           <h4>퇴근 기록</h4>
//           {records.out.map((t,i)=><div key={i}>{t}</div>)}
//         </div>
//       </div>
//     </div>
//   );
// }

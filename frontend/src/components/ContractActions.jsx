import { useState } from 'react';
import axios from 'axios';

export default function ContractActions({ agreementId }) {
  const [status, setStatus] = useState('');

  const call = async (url, label) => {
    try {
        setStatus(`${label} 중…`);
        const { data } = await axios.post(url, { id: agreementId });
        setStatus(`${label} 완료 tx: ${data.txHash}`);
    } catch (err) {
    // err.response.data.error 에 서버에서 보낸 메시지가 들어있습니다.
    const msg = err.response?.data?.error || err.message;
    setStatus(`❌ ${label} 실패: ${msg}`);
    }
  };

  return (
    <div>
      <h2>서명 & 승인</h2>
      <button onClick={()=>call('/api/sign/employer','고용주 서명')}>고용주 서명</button>
      <button onClick={()=>call('/api/sign/worker','근로자 서명')}>근로자 서명</button>
      <button onClick={()=>call('/api/approve','최종 승인')}>승인</button>
      <p>{status}</p>
    </div>
  );
}

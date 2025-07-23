import { useState } from 'react';
import axios from 'axios';

export default function ContractRegistration({ onRegistered }) {
  const [file, setFile] = useState(null);
  const [expiry, setExpiry] = useState('');
  const [msg, setMsg] = useState('');

  const handleRegister = async () => {
    if (!file || !expiry) return setMsg('파일과 만료일을 선택하세요');
    setMsg('1) IPFS에 업로드 중…');
    const form = new FormData();
    form.append('contract', file);
    const { data: { cid } } = await axios.post('/api/uploadContract', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    setMsg(`2) 온체인 등록 중… (${cid})`);
    const expiryTs = Math.floor(new Date(expiry).getTime()/1000);
    const { data: { txHash, id } } = await axios.post('/api/register', { cid, expiryTs });
    setMsg(`등록 완료! id: ${id}, tx: ${txHash}`);
    onRegistered(id);  // 부모 컴포넌트에 ID 알림
  };

  return (
    <div>
      <h2>계약 등록</h2>
      <input type="file" accept="application/pdf"
             onChange={e => setFile(e.target.files[0])} />
      <input type="datetime-local"
             value={expiry}
             onChange={e => setExpiry(e.target.value)} />
      <button onClick={handleRegister}>등록하기</button>
      <p>{msg}</p>
    </div>
  );
}

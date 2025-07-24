// /src/App.js
import './App.css';
import { useState } from 'react';
import ContractRegistration from './components/ContractRegistration';
import ContractActions from './components/ContractActions';
import TimeSheet from './components/TimeSheet';

export default function App() {
  const [agreementId, setAgreementId] = useState(null);

  return (
     <div style={{ padding: 32 }}>
      <h1>근로 계약 서비스</h1>
      <ContractRegistration onRegistered={setAgreementId}/>
      {agreementId !== null && (
        <>
          <ContractActions agreementId={agreementId}/>
          <TimeSheet       agreementId={agreementId}/>
        </>
      )}
    </div>
  );
}


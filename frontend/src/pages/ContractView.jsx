import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getContract, signContract } from "../services/contracts";
import ContractPreview from "../components/ContractPreview";
import SignaturePad from "../components/SignaturePad";
import { ipfsGatewayUrl, ipfsGatewayUrls } from "../utils/ipfs";
import { getTxDetails, etherscanTxUrl } from "../utils/etherscan";
import BlockchainLoader from "../components/BlockchainLoader";
import "./ContractView.css";

export default function ContractView() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSignPad, setShowSignPad] = useState(false);
  const [signError, setSignError] = useState("");
  const [signLoading, setSignLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [signRole, setSignRole] = useState(null); // EMPLOYEE | EMPLOYER
  const [txDetails, setTxDetails] = useState(null);
  const fmt = (n) => (n === null || n === undefined ? "-" : n.toLocaleString());
  const statusKo = (s) => (s === "success" ? "성공" : s === "failed" ? "실패" : "처리 중");
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    async function run() {
      try {
        const doc = await getContract(id);
        setContract(doc);
      } catch (err) {
        setError(err.message || "계약 조회 실패");
      } finally {
        setLoading(false);
      }
    }
    run();
    // 10초 폴링
    const itv = setInterval(run, 10000);
    return () => clearInterval(itv);
  }, [id]);

  // Load Etherscan tx details when approved and txHash exists
  useEffect(() => {
    async function loadTx() {
      if (contract?.status === "APPROVED" && contract.final?.txHash) {
        const d = await getTxDetails(contract.final.txHash);
        setTxDetails(d);
      }
    }
    loadTx();
  }, [contract?.status, contract?.final?.txHash]);

  const handleSignSave = async (dataUrl) => {
    try {
      setSignError("");
      // 서명 패드 닫기
      setShowSignPad(false);
      // 로딩 시작 (고용주 서명일 때만 블록체인 업로드)
      const currentRole = signRole;
      if (currentRole === "EMPLOYER") {
        setIsUploading(true);
      }
      
      const signerAddr = currentRole === "EMPLOYER"
        ? contract.employer.address
        : contract.employee.address;
      
      await signContract(id, {
        signer: signerAddr,
        sig: "",
        signType: "DRAWN",
        signBlob: dataUrl,
      });
      
      const updated = await getContract(id);
      setContract(updated);
      setSignRole(null);
      
      alert("✅ 서명이 저장되었습니다.");
    } catch (err) {
      setSignError(err.message || "서명 실패");
      setIsUploading(false);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      DRAFT: { label: "작성중", class: "status-draft" },
      INVITED: { label: "초대됨", class: "status-draft" },
      ACCEPTED: { label: "승인대기", class: "status-accepted" },
      PENDING_SIGN: { label: "서명대기", class: "status-accepted" },
      SIGNED_EMP: { label: "근로자 서명완료", class: "status-signed" },
      SIGNED_BOTH: { label: "서명완료", class: "status-signed" },
      APPROVED: { label: "진행중", class: "status-approved" },
    };
    return statusMap[status] || { label: status, class: "status-draft" };
  };

  if (loading) {
    return (
      <div className="contract-view-container">
        <div className="loading-state">⏳ 불러오는 중...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="contract-view-container">
        <div className="error-message">오류: {error}</div>
      </div>
    );
  }
  
  if (!contract) {
    return (
      <div className="contract-view-container">
        <div className="empty-state">계약이 없습니다.</div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(contract.status);

  // 계약의 커스텀 이름 가져오기 (없으면 기본 title 반환)
  const getContractDisplayName = (contract) => {
    if (!user || !contract.customNames) return contract.title || "계약서";
    const customName = contract.customNames.find(
      cn => cn.address.toLowerCase() === user.walletAddress.toLowerCase() && cn.role === user.role
    );
    return customName?.customName || contract.title || "계약서";
  };

  return (
    <>
      {isUploading && (
        <BlockchainLoader message="블록체인에 업로드 중..." />
      )}
      
      <div className="contract-view-container">
        <div className="contract-view-header">
          <h1 className="contract-view-title">{getContractDisplayName(contract)}</h1>
        </div>

      <div className="contract-info-card">
        <div className="info-row">
          <span className="info-label">계약 ID</span>
          <span className="info-value">{contract.contractId}</span>
        </div>
        <div className="info-row">
          <span className="info-label">상태</span>
          <span className={`status-badge ${statusInfo.class}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="contract-content-card">
        <h2 className="section-title">계약 내용</h2>
        <ContractPreview contract={contract} />
      </div>

      {/* 근로자 서명: 계약이 ACCEPTED 이고, 로그인 사용자가 근로자일 때 */}
      {contract.status === "ACCEPTED" && user?.role === "EMPLOYEE" &&
        user?.walletAddress?.toLowerCase() === contract.employee?.address?.toLowerCase() && (
        <button
          className="action-button action-button-primary"
          onClick={() => { setSignRole("EMPLOYEE"); setShowSignPad(true); }}
          style={{ marginTop: 20 }}
        >
          서명하기
        </button>
      )}

      {/* 고용주 최종 승인(서명): 직원이 서명 완료(SIGNED_EMP)이고 로그인 사용자가 고용주일 때 */}
      {contract.status === "SIGNED_EMP" && user?.role === "EMPLOYER" &&
        user?.walletAddress?.toLowerCase() === contract.employer?.address?.toLowerCase() && (
        <button
          className="action-button action-button-primary"
          onClick={() => { setSignRole("EMPLOYER"); setShowSignPad(true); }}
          disabled={signLoading}
          style={{ marginTop: 12 }}
        >
          {signLoading ? "승인 처리 중..." : "최종 승인 진행"}
        </button>
      )}

      {contract.status === "APPROVED" && (
        <div className="approved-card">
          <div className="approved-title">✅ 최종 승인 완료</div>
          {contract.final?.ipfsCid && (
            <div className="approved-actions">
              <a
                href={ipfsGatewayUrl(contract.final.ipfsCid)}
                target="_blank"
                rel="noreferrer"
                className="approved-link"
              >
                PDF 다운로드
              </a>
              {contract.final?.txHash && (
                <a
                  href={etherscanTxUrl(contract.final.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="approved-link"
                >
                  Etherscan에서 보기
                </a>
              )}
            </div>
          )}

        </div>
      )}

      {signError && (
        <div className="error-message">{signError}</div>
      )}

      {showSignPad && (
        <div className="sign-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSignPad(false);
            setSignRole(null);
          }
        }}>
          <div className="sign-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="sign-modal-title">서명 입력</h3>
            <SignaturePad 
              onSave={handleSignSave} 
              onCancel={() => {
                setShowSignPad(false);
                setSignRole(null);
              }}
            />
          </div>
        </div>
      )}
      </div>
    </>
  );
}



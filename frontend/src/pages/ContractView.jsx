import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getContract, signContract } from "../services/contracts";
import ContractPreview from "../components/ContractPreview";
import SignaturePad from "../components/SignaturePad";
import { ipfsGatewayUrl, ipfsGatewayUrls } from "../utils/ipfs";
import { getTxDetails, etherscanTxUrl } from "../utils/etherscan";

export default function ContractView() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSignPad, setShowSignPad] = useState(false);
  const [signError, setSignError] = useState("");
  const [signLoading, setSignLoading] = useState(false);
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
      setSignLoading(true);
      const signerAddr = signRole === "EMPLOYER"
        ? contract.employer.address
        : contract.employee.address;
      await signContract(id, {
        signer: signerAddr,
        sig: "",
        signType: "DRAWN",
        signBlob: dataUrl,
      });
      alert("✅ 서명이 저장되었습니다.");
      const updated = await getContract(id);
      setContract(updated);
      setShowSignPad(false);
      setSignRole(null);
    } catch (err) {
      setSignError(err.message || "서명 실패");
    }
    finally {
      setSignLoading(false);
    }
  };

  if (loading) return <p>⏳ 불러오는 중...</p>;
  if (error) return <p style={{ color: "crimson" }}>오류: {error}</p>;
  if (!contract) return <p>계약이 없습니다.</p>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>계약서 보기</h1>
      <p>계약 ID: {contract.contractId}</p>
      <p>상태: {contract.status}</p>

      <h2 style={{ marginTop: 24 }}>계약 내용</h2>
      <ContractPreview contract={contract} />

      {/* 근로자 서명: 계약이 ACCEPTED 이고, 로그인 사용자가 근로자일 때 */}
      {contract.status === "ACCEPTED" && user?.role === "EMPLOYEE" &&
        user?.walletAddress?.toLowerCase() === contract.employee?.address?.toLowerCase() && (
        <button
          onClick={() => { setSignRole("EMPLOYEE"); setShowSignPad(true); }}
          style={{ marginTop: 20, padding: "10px 16px" }}
        >
          서명하기
        </button>
      )}

      {/* 고용주 최종 승인(서명): 직원이 서명 완료(SIGNED_EMP)이고 로그인 사용자가 고용주일 때 */}
      {contract.status === "SIGNED_EMP" && user?.role === "EMPLOYER" &&
        user?.walletAddress?.toLowerCase() === contract.employer?.address?.toLowerCase() && (
        <button
          onClick={() => { setSignRole("EMPLOYER"); setShowSignPad(true); }}
          style={{ marginTop: 12, padding: "10px 16px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6 }}
        >
          {signLoading ? "승인 처리 중..." : "최종 승인 진행"}
        </button>
      )}

      {contract.status === "APPROVED" && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f0fdf4" }}>
          <div style={{ marginBottom: 8, color: "#166534", fontWeight: 600 }}>✅ 최종 승인 완료</div>
          {contract.final?.ipfsCid && (
            <>
              <a
                href={ipfsGatewayUrl(contract.final.ipfsCid)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", marginRight: 12 }}
              >
                PDF 다운로드 (Pinata)
              </a>
            </>
          )}
          {contract.final?.txHash && (
            <div style={{ marginTop: 8 }}>
              <a href={etherscanTxUrl(contract.final.txHash)} target="_blank" rel="noreferrer">
                Etherscan에서 보기
              </a>
            </div>
          )}

          {/* {txDetails && (
            <div style={{ marginTop: 12, fontSize: 14, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>온체인 등록 정보</div>
              <div>블록 번호(기록 순번): {fmt(txDetails.blockNumber)}</div>
              <div>처리 결과: {statusKo(txDetails.status)}</div>
              <div>보낸 지갑(From): {txDetails.from}</div>
              <div>받는 주소(To): {txDetails.to}</div>
              <div>사용된 연산량(가스): {fmt(txDetails.gasUsed)}</div>
              <div>처리 시간: {txDetails.timestamp ? new Date(txDetails.timestamp).toLocaleString() : "-"}</div>
              <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
                가스는 거래 처리에 필요한 연산량을 뜻해요. 금액은 네트워크 상황에 따라 달라집니다.
              </div>
            </div>
          )} */}
        </div>
      )}

      {signError && <p style={{ color: "crimson" }}>{signError}</p>}

      {showSignPad && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "#fff", padding: 20, borderRadius: 8 }}>
            <h3>서명 입력</h3>
            <SignaturePad onSave={handleSignSave} />
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button onClick={() => setShowSignPad(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getContract, signContract } from "../services/contracts";
import { ipfsGatewayUrl, ipfsGatewayUrls } from "../utils/ipfs";
import { getTxDetails, etherscanTxUrl } from "../utils/etherscan";
import SignaturePad from "../components/SignaturePad";
import ContractPreview from "../components/ContractPreview";

export default function ContractApprove() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSignPad, setShowSignPad] = useState(false);
  const [signError, setSignError] = useState("");
  const [txDetails, setTxDetails] = useState(null);
  const fmt = (n) => (n === null || n === undefined ? "-" : n.toLocaleString());
  const statusKo = (s) => (s === "success" ? "성공" : s === "failed" ? "실패" : "처리 중");

  useEffect(() => {
    async function run() {
      try {
        const doc = await getContract(id);
        setContract(doc);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [id]);

  useEffect(() => {
    async function load() {
      if (contract?.status === "APPROVED" && contract.final?.txHash) {
        const d = await getTxDetails(contract.final.txHash);
        setTxDetails(d);
      }
    }
    load();
  }, [contract?.status, contract?.final?.txHash]);

  const handleApprove = async (dataUrl) => {
    try {
      setSignError("");
      await signContract(id, {
        inviteId: contract.invites.find((i) => i.role === "EMPLOYER")?.id,
        signer: contract.employer.address,
        sig: "",
        signType: "DRAWN",
        signBlob: dataUrl,
      });

      alert("✅ 고용주 서명 + 최종 승인이 완료되었습니다.");
      const updated = await getContract(id);
      setContract(updated);
      setShowSignPad(false);
    } catch (err) {
      setSignError(err.message || "승인 실패");
    }
  };

  if (loading) return <p>⏳ 불러오는 중...</p>;
  if (error) return <p style={{ color: "crimson" }}>오류: {error}</p>;
  if (!contract) return <p>계약이 없습니다.</p>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>계약 상세 / 최종 승인</h1>
      <p>계약 ID: {contract.contractId}</p>
      <p>상태: {contract.status}</p>

      <h2>계약 내용</h2>
      <ContractPreview contract={contract} />

      {contract.status === "SIGNED_EMP" && (
        <button onClick={() => setShowSignPad(true)} style={{ marginTop: 20 }}>
          고용주 서명 및 승인
        </button>
      )}

      {signError && <p style={{ color: "crimson" }}>{signError}</p>}

      {showSignPad && (
        <div className="popup">
          <h3>서명 입력</h3>
          <SignaturePad onSave={handleApprove} />
          <button onClick={() => setShowSignPad(false)}>취소</button>
        </div>
      )}

      {contract.status === "APPROVED" && (
        <div style={{ marginTop: 24, color: "green" }}>
          ✅ 최종 승인 완료!  
          <p>IPFS CID: {contract.final?.ipfsCid}</p>
          <p>Tx Hash: {contract.final?.txHash}</p>
          {contract.final?.ipfsCid && (
            <>
              <a
                href={ipfsGatewayUrl(contract.final.ipfsCid)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", marginTop: 8, marginRight: 8 }}
              >
                PDF 다운로드 (Pinata)
              </a>
              
              {contract.final?.txHash && (
                <div style={{ marginTop: 8 }}>
                  <a href={etherscanTxUrl(contract.final.txHash)} target="_blank" rel="noreferrer">
                    Etherscan에서 보기
                  </a>
                </div>
              )}
              {/* {txDetails && (
                <div style={{ marginTop: 8, fontSize: 14, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

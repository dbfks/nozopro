import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getContract, signContract } from "../services/contracts";
import SignaturePad from "../components/SignaturePad";

export default function ContractApprove() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSignPad, setShowSignPad] = useState(false);
  const [signError, setSignError] = useState("");

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
      <pre style={{ background: "#f7f7f7", padding: 12 }}>
        {JSON.stringify(contract.docJson, null, 2)}
      </pre>

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
        </div>
      )}
    </div>
  );
}

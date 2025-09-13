import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { acceptContract, getContract, signContract } from "../services/contracts";
import SignaturePad from "../components/SignaturePad";

export default function ContractAccept() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("inviteId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contract, setContract] = useState(null);

  const [showSignPad, setShowSignPad] = useState(false);
  const [signError, setSignError] = useState("");

  useEffect(() => {
    async function run() {
      try {
        await acceptContract(id, { inviteId });
        const doc = await getContract(id);
        setContract(doc);
      } catch (err) {
        setError(err.message || "계약 수락 중 오류 발생");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [id, inviteId]);

  const handleSignSave = async (dataUrl) => {
    try {
      setSignError("");
      await signContract(id, {
        inviteId,
        signer: contract.employee.address,
        sig: "",
        signType: "DRAWN",
        signBlob: dataUrl,
      });
      alert("✅ 서명이 저장되었습니다.");
      const updated = await getContract(id);
      setContract(updated);
      setShowSignPad(false);
    } catch (err) {
      setSignError(err.message || "서명 실패");
    }
  };

  if (loading) return <p>⏳ 처리 중...</p>;
  if (error) return <p style={{ color: "crimson" }}>오류: {error}</p>;
  if (!contract) return <p>계약을 불러오지 못했습니다.</p>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>계약 수락</h1>
      <p>계약 ID: {contract.contractId}</p>
      <p>상태: {contract.status}</p>

      <h2 style={{ marginTop: 24 }}>계약 내용</h2>
      <pre style={{ background: "#f7f7f7", padding: 12 }}>
        {JSON.stringify(contract.docJson, null, 2)}
      </pre>

      {contract.status === "ACCEPTED" && (
        <button
          onClick={() => setShowSignPad(true)}
          style={{ marginTop: 20, padding: "10px 16px" }}
        >
          서명하기
        </button>
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

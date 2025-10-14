import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getContract } from "../services/contracts";
import ContractPreview from "../components/ContractPreview";

export default function ContractView() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, [id]);

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

      {contract.status === "APPROVED" && contract.final?.ipfsCid && (
        <a
          href={`https://ipfs.io/ipfs/${contract.final.ipfsCid}`}
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-block", marginTop: 12 }}
        >
          PDF 다운로드
        </a>
      )}
    </div>
  );
}



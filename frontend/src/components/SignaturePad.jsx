import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignaturePad({ onSave, onCancel }) {
  const sigRef = useRef();

  const handleClear = () => {
    sigRef.current.clear();
  };

  const handleSave = () => {
    if (sigRef.current.isEmpty()) {
      alert("서명을 입력하세요!");
      return;
    }
    const dataUrl = sigRef.current.toDataURL("image/png");
    console.log("SignaturePad → onSave 호출됨:", dataUrl.slice(0, 40)); // 디버깅용
    onSave(dataUrl);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff",
        padding: 20,
        border: "1px solid #ccc",
        borderRadius: 8,
        zIndex: 1000,
      }}
    >
      <h3>서명 입력</h3>
      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        canvasProps={{ width: 400, height: 200, className: "border" }}
      />
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button onClick={handleClear}>지우기</button>
        <button onClick={handleSave}>저장</button>
        <button onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

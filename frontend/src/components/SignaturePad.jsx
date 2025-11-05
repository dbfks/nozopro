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
    <div>
      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        backgroundColor="#ffffff"
        canvasProps={{ width: 400, height: 200, className: "border" }}
        style={{ 
          border: "1px solid #e5e7eb", 
          borderRadius: 8,
          background: "#ffffff"
        }}
      />
      <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button 
          onClick={handleClear}
          style={{
            padding: "8px 16px",
            background: "#f3f4f6",
            color: "#374151",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600
          }}
        >
          지우기
        </button>
        <button 
          onClick={handleSave}
          style={{
            padding: "8px 16px",
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600
          }}
        >
          저장
        </button>
        {onCancel && (
          <button 
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600
            }}
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

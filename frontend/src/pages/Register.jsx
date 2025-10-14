import { useState } from "react";
import axios from "axios";

export default function Register() {
  const [role, setRole] = useState("WORKER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask를 설치해주세요!");
      return;
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    setWallet(accounts[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/register", {
        name,
        email,
        walletAddress: wallet,
        role,
      });
      alert("회원가입 성공!");
      console.log(res.data.user);
    } catch (err) {
      console.error("register error:", err);
      alert("회원가입 실패: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">회원가입</h2>

      {/* 역할 선택 탭 */}
      <div className="tab">
        <button
          className={role === "WORKER" ? "active" : "inactive"}
          onClick={() => setRole("WORKER")}
        >
          근로자
        </button>
        <button
          className={role === "EMPLOYER" ? "active" : "inactive"}
          onClick={() => setRole("EMPLOYER")}
        >
          고용주
        </button>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
          />
        </div>

        <div className="form-group">
          <label>이메일</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
          />
        </div>

        <div className="form-group">
          <label>지갑 주소  </label>
          {wallet ? (
            <p className="wallet-address">{wallet}</p>
          ) : (
            <button
              type="button"
              className="button metamask"
              onClick={connectWallet}
            >
              MetaMask 연결
            </button>
          )}
        </div>

        <button className="button primary" type="submit" disabled={!wallet}>
          회원가입
        </button>
      </form>
    </div>
  );
}

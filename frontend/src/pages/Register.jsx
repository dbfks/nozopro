import { useState } from "react";
import axios from "axios";

export default function Register() {
  const [role, setRole] = useState("WORKER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState(null);

  // MetaMask 감지 함수
  const checkMetaMask = () => {
    // window.ethereum이 가장 일반적인 방법
    if (window.ethereum) {
      return true;
    }
    // 모바일이나 구버전 브라우저를 위한 fallback
    if (window.web3 && window.web3.currentProvider) {
      window.ethereum = window.web3.currentProvider;
      return true;
    }
    return false;
  };

  const connectWallet = async () => {
    // 다시 한 번 확인
    const hasMetaMask = checkMetaMask();
    
    if (!hasMetaMask) {
      // 모바일 환경 체크
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isMetaMaskBrowser = navigator.userAgent.includes('MetaMask');
      
      if (isMobile && !isMetaMaskBrowser) {
        alert(
          "MetaMask 앱에서 이 사이트를 열어주세요.\n\n" +
          "또는 일반 브라우저에서 MetaMask 앱을 설치한 후,\n" +
          "MetaMask 브라우저로 이 사이트를 여시기 바랍니다."
        );
      } else {
        alert("MetaMask를 설치해주세요!");
      }
      return;
    }

    try {
      const provider = window.ethereum || window.web3?.currentProvider;
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      setWallet(accounts[0]);
    } catch (err) {
      console.error("Wallet connection error:", err);
      // 사용자가 연결을 거부한 경우
      if (err.code === 4001) {
        alert("MetaMask 연결이 취소되었습니다.");
      } else {
        alert("MetaMask 연결 실패: " + err.message);
      }
    }
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

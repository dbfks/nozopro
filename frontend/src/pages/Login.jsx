import { useState, useEffect } from "react";
import axios from "axios";

export default function Login() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setAccount(JSON.parse(savedUser).walletAddress);
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask를 설치해주세요!");
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const walletAddress = accounts[0];
      setAccount(walletAddress);

      const res = await axios.post("/api/login", { walletAddress });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      alert("로그인 성공!");
    } catch (err) {
      console.error("Login error:", err);
      alert("로그인 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setAccount(null);
    alert("로그아웃 되었습니다.");
    window.location.href = "/";
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">MetaMask 로그인</h2>

      {user ? (
        <div className="auth-info">
          <p>
            연결된 지갑: <b>{user.walletAddress}</b>
          </p>
          <p>
            <b>이름:</b> {user.name} / <b>역할:</b> {user.role}
          </p>
          <button className="button primary" onClick={logout}>
            로그아웃
          </button>
        </div>
      ) : (
        <button
          className="button metamask"
          onClick={connectWallet}
          disabled={loading}
        >
          {loading ? "로그인 중..." : "MetaMask 연결"}
        </button>
      )}
    </div>
  );
}

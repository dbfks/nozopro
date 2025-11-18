import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [metaMaskAvailable, setMetaMaskAvailable] = useState(false);
  const [showInstallAlert, setShowInstallAlert] = useState(false);

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

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setAccount(userData.walletAddress);
      
      // 이미 로그인된 사용자는 자동으로 적절한 페이지로 리다이렉트
      if (userData.role === "EMPLOYER") {
        navigate("/ui/contracts/new");
      } else {
        navigate("/ui/contracts/list");
      }
    } else {
      // 로그인되지 않은 경우에만 MetaMask 감지
      // MetaMask 감지 (페이지 로드 시)
      const check = checkMetaMask();
      setMetaMaskAvailable(check);

      // 모바일 환경에서 MetaMask가 늦게 로드될 수 있으므로 짧은 지연 후 재확인
      const timer = setTimeout(() => {
        const recheck = checkMetaMask();
        if (recheck !== check) {
          setMetaMaskAvailable(recheck);
        }
      }, 500);

      // ethereum 객체가 추가될 때를 감지 (최대 5초간 시도)
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        const recheck = checkMetaMask();
        if (recheck) {
          setMetaMaskAvailable(true);
          clearInterval(checkInterval);
        } else if (attempts >= 5) {
          // 5초 후에도 감지되지 않으면 중단
          clearInterval(checkInterval);
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(checkInterval);
      };
    }
  }, [navigate]);

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
        setShowInstallAlert(true);
      }
      return;
    }

    try {
      setLoading(true);
      const provider = window.ethereum || window.web3?.currentProvider;
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      const walletAddress = accounts[0];
      setAccount(walletAddress);

      const res = await axios.post("/api/login", { walletAddress });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      setShowInstallAlert(false);
      
      // 역할에 따라 적절한 페이지로 리다이렉트
      const userRole = res.data.user.role;
      if (userRole === "EMPLOYER") {
        navigate("/ui/contracts/new");
      } else {
        // WORKER, EMPLOYEE 등
        navigate("/ui/contracts/list");
      }
    } catch (err) {
      console.error("Login error:", err);
      // 사용자가 연결을 거부한 경우
      if (err.code === 4001) {
        alert("MetaMask 연결이 취소되었습니다.");
      } else {
        alert("로그인 실패: " + (err.response?.data?.error || err.message));
      }
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

      {showInstallAlert && (
        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <p style={{ margin: "0 0 12px 0", color: "#333" }}>
            MetaMask를 설치해주세요!
          </p>
          <button
            onClick={() => setShowInstallAlert(false)}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              float: "right"
            }}
          >
            닫기
          </button>
          <div style={{ clear: "both" }}></div>
        </div>
      )}

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

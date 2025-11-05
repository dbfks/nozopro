import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Landing.css";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* 네비게이션 바 */}
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-dots">
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <span className="logo-text">Nozopro</span>
          </div>
          
          <div className="nav-menu">
            <a href="#services" className="nav-link">
              서비스 <span className="arrow">▼</span>
            </a>
            <a href="#features" className="nav-link">
              기능 <span className="arrow">▼</span>
            </a>
            <a href="#pricing" className="nav-link">
              가격 <span className="arrow">▼</span>
            </a>
            <a href="#resources" className="nav-link">
              리소스 <span className="arrow">▼</span>
            </a>
          </div>

          <div className="nav-actions">
            <Link to="/ui/login" className="btn-login">
              로그인
            </Link>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            계약 관리, Nozopro로<br />모든 것을 해결합니다.
          </h1>
          <div className="hero-actions">
            <Link to="/ui/register" className="btn-primary">
              지금 시작하기 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}


// src/App.jsx
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import CreateContract from "./pages/CreateContract";
import EditContract from "./pages/EditContract";
import InviteContract from "./pages/InviteContract";
import ContractAccept from "./pages/ContractAccept";
import ContractApprove from "./pages/ContractApprove";
import ContractList from "./pages/ContractList";
import ContractView from "./pages/ContractView";
import TimeSheet from "./pages/TimeSheet";
import Login from "./pages/Login";
import Register from "./pages/Register";
import InviteHistory from "./pages/InviteHistory";
import Landing from "./pages/Landing";
import CareerHistory from "./pages/CareerHistory";
import ResumeBuilder from "./pages/ResumeBuilder";
import TimeEntryNotifications from "./pages/TimeEntryNotifications";
import "./App.css";
import "./pages/Landing.css";

function Nav() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser(null);
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // 랜딩 페이지에서는 네비게이션 숨기기
  if (pathname === "/" || pathname === "/ui") {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/ui/login";
  };

  return (
    <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-container">
        {/* 로고 */}
        <Link to="/" className="nav-logo">
          <div className="logo-dots">
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="logo-text">Nozopro</span>
        </Link>

        {/* 메뉴 */}
        <div className="nav-menu">
          {user?.role === "EMPLOYER" && (
            <Link 
              to="/ui/contracts/new" 
              className={`nav-link ${pathname === "/ui/contracts/new" ? "active" : ""}`}
            >
              계약등록
            </Link>
          )}
          <Link 
            to="/ui/contracts/list" 
            className={`nav-link ${pathname.includes("/ui/contracts/list") ? "active" : ""}`}
          >
            계약조회
          </Link>
          <Link 
            to="/ui/time-entries" 
            className={`nav-link ${pathname === "/ui/time-entries" ? "active" : ""}`}
          >
            근태기록
          </Link>
          {(user?.role === "WORKER" || user?.role === "EMPLOYEE") && (
            <>
              <Link 
                to="/ui/career-history" 
                className={`nav-link ${pathname === "/ui/career-history" ? "active" : ""}`}
              >
                경력조회
              </Link>
              <Link 
                to="/ui/resume" 
                className={`nav-link ${pathname === "/ui/resume" ? "active" : ""}`}
              >
                이력서작성
              </Link>
            </>
          )}
        </div>

        {/* 로그인/로그아웃 버튼 */}
        <div className="nav-actions">
          {user ? (
            <>
              <span style={{ 
                fontSize: "14px", 
                color: "#10b981",
                marginRight: "8px"
              }}>
                {user.name}
              </span>
              <button onClick={handleLogout} className="btn-login">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/ui/login" className="btn-login">
                로그인
              </Link>
              <Link to="/ui/register" className="btn-inquire">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}


function MainContent() {
  const { pathname } = useLocation();
  return (
    <main style={{ 
      padding: pathname === "/" || pathname === "/ui" ? 0 : 16,
      paddingTop: pathname === "/" || pathname === "/ui" ? 0 : 90
    }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/ui" element={<Landing />} />
        <Route 
          path="/ui/contracts/new" 
          element={
            (() => {
              const user = JSON.parse(localStorage.getItem("user") || "null");
              if (!user || user.role !== "EMPLOYER") {
                return <ContractList />;
              }
              return <CreateContract />;
            })()
          } 
        />
        <Route path="/ui/contracts/:id/edit" element={<EditContract />} />
        <Route path="/ui/contracts/:id/accept" element={<ContractAccept />} />
        <Route path="/ui/contracts/:id/invite" element={<InviteContract />} />
        <Route path="/ui/contracts/:id/approve" element={<ContractApprove />} />
        <Route path="/ui/contracts/:id/view" element={<ContractView />} />
        <Route path="/ui/timesheet/:id" element={<TimeSheet />} />
        <Route path="/ui/register" element={<Register />} />
        <Route path="/ui/login" element={<Login />} />
        <Route path="/ui/contracts/list" element={<ContractList />} />
        <Route path="/ui/invite-history" element={<InviteHistory />} />
        <Route path="/ui/career-history" element={<CareerHistory />} />
        <Route path="/ui/resume" element={<ResumeBuilder />} />
        <Route path="/ui/time-entries" element={<TimeEntryNotifications />} />
        {/* 기본 라우트 → 로그인 or 계약등록 */}
        <Route
          path="*"
          element={
            (() => {
              const user = JSON.parse(localStorage.getItem("user"));
              return user ? (
                user.role === "EMPLOYER" ? (
                  <CreateContract />
                ) : (
                  <ContractList />
                )
              ) : (
                <Landing />
              );
            })()
          }
        />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <MainContent />
    </BrowserRouter>
  );
}

// src/App.jsx
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import CreateContract from "./pages/CreateContract";
import InviteContract from "./pages/InviteContract";
import ContractAccept from "./pages/ContractAccept";
import ContractApprove from "./pages/ContractApprove";
import ContractList from "./pages/ContractList";
import ContractView from "./pages/ContractView";
import TimeSheet from "./pages/TimeSheet";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./App.css";

function Nav() {
  const { pathname } = useLocation();

  const navItem = (to, label) => (
    <Link
      to={to}
      style={{
        margin: "0 12px",
        padding: "8px 12px",
        fontWeight: 500,
        textDecoration: "none",
        color: pathname === to ? "#007bff" : "#333",
        borderBottom: pathname === to ? "2px solid #007bff" : "none",
      }}
    >
      {label}
    </Link>
  );

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 80,
        padding: "0 24px",
        background: "#fff",
        borderBottom: "1px solid #eee",
      }}
    >
      {/* 로고 */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <img src="/images/Nozopro.png" alt="Nozopro" style={{ height: 80, marginRight: 16 }} />
      </div>

      {/* 메뉴 */}
      <nav style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        {navItem("/ui/contracts/new", "계약등록")}
        {navItem("/ui/contracts/list", "계약조회")}
        {navItem("/ui/timesheet", "근태기록")}
      </nav>

      {/* 로그인/회원가입 */}
      <div>
        {navItem("/ui/login", "로그인")}
        {navItem("/ui/register", "회원가입")}
      </div>
    </header>
  );
}


export default function App() {
  //const isLoggedIn = !!localStorage.getItem("user");
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <BrowserRouter>
      <Nav />
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/ui/contracts/new" element={<CreateContract />} />
          <Route path="/ui/contracts/:id/accept" element={<ContractAccept />} />
          <Route path="/ui/contracts/:id/invite" element={<InviteContract />} />
          <Route path="/ui/contracts/:id/approve" element={<ContractApprove />} />
          <Route path="/ui/contracts/:id/view" element={<ContractView />} />
          <Route path="/ui/timesheet/:id" element={<TimeSheet />} />
          <Route path="/ui/register" element={<Register />} />
          <Route path="/ui/login" element={<Login />} />
          <Route path="/ui/contracts/list" element={<ContractList />} />
          {/* 기본 라우트 → 로그인 or 계약등록 */}
          <Route
            path="*"
            element={
              user ? (
                user.role === "EMPLOYER" ? (
                  <CreateContract />
                ) : (
                  <ContractList />
                )
              ) : (
                <Login />
              )
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

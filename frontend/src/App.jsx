// src/App.jsx
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import CreateContract from "./pages/CreateContract";
import InviteContract from "./pages/InviteContract";
import ContractAccept from "./pages/ContractAccept"; // 초대 수락 + OTP + 서명
import ContractApprove from "./pages/ContractApprove";
import "./App.css";

function Nav() {
  const { pathname } = useLocation();
  const navItem = (to, label) => (
    <Link
      to={to}
      style={{
        marginRight: 8,
        padding: "8px 16px",
        textDecoration: "none",
        borderRadius: 4,
        background: pathname === to ? "#007bff" : "#eee",
        color: pathname === to ? "#fff" : "#333",
      }}
    >
      {label}
    </Link>
  );
  return (
    <nav style={{ padding: "8px 12px", background: "#fafafa" }}>
      {navItem("/ui/contracts/new", "계약등록")}
      {navItem("/ui/contracts/search", "계약조회")}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/ui/contracts/new" element={<CreateContract />} />
          <Route path="/ui/contracts/:id/accept" element={<ContractAccept />} />
          <Route path="/ui/contracts/:id/invite" element={<InviteContract />} />
          <Route path="/ui/contracts/:id/approve" element={<ContractApprove />} />
          {/* 기본: 등록 페이지 */}
          <Route path="*" element={<CreateContract />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

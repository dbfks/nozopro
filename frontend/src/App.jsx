// src/App.jsx
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ContractCreate from "./pages/ContractCreate";
import ContractSearch from "./pages/ContractSearch";
import ApprovedContracts from "./pages/ApprovedContracts";
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
      {navItem("/ui/contracts/approved", "승인된 계약목록")}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/ui/contracts/new" element={<ContractCreate />} />
          <Route path="/ui/contracts/search" element={<ContractSearch />} />
          <Route path="/ui/contracts/approved" element={<ApprovedContracts />} />
          {/* 기본: 등록 페이지 */}
          <Route path="*" element={<ContractCreate />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

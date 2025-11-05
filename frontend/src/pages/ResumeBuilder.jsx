// src/pages/ResumeBuilder.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "./ResumeBuilder.css";

export default function ResumeBuilder() {
  const [careers, setCareers] = useState([]);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCareers, setSelectedCareers] = useState([]);
  const [showCareerModal, setShowCareerModal] = useState(false);
  
  const [resumeData, setResumeData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    careerItems: [],
    selfIntroduction: ""
  });

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user || (user.role !== "WORKER" && user.role !== "EMPLOYEE")) {
      alert("근로자만 접근할 수 있습니다.");
      window.location.href = "/ui/contracts/list";
      return;
    }
    // 사용자 정보 불러오기
    if (user) {
      setResumeData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || ""
      }));
    }
    loadCareers();
  }, []);

  const loadCareers = async () => {
    if (!user) return;
    try {
      setLoadingCareers(true);
      const res = await axios.get(`/api/contracts/expired/${user.walletAddress}`);
      setCareers(res.data.careers || []);
    } catch (err) {
      console.error("경력 조회 실패:", err);
      alert("경력 조회 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoadingCareers(false);
    }
  };

  const handleToggleCareerSelection = (careerId) => {
    setSelectedCareers(prev => 
      prev.includes(careerId)
        ? prev.filter(id => id !== careerId)
        : [...prev, careerId]
    );
  };

  const handleLoadSelectedCareers = () => {
    if (selectedCareers.length === 0) {
      alert("불러올 경력을 선택해주세요.");
      return;
    }

    const careersToAdd = careers.filter(c => 
      selectedCareers.includes(c.careerId) &&
      !resumeData.careerItems.some(item => item.careerId === c.careerId)
    );

    if (careersToAdd.length === 0) {
      alert("선택한 경력이 모두 이미 추가되어 있습니다.");
      setShowCareerModal(false);
      setSelectedCareers([]);
      return;
    }

    const newCareerItems = careersToAdd.map(career => ({
      careerId: career.careerId,
      employerName: career.employerName,
      position: career.position,
      startDate: career.startDate,
      endDate: career.endDate,
      workMonths: career.workMonths
    }));

    setResumeData(prev => ({
      ...prev,
      careerItems: [...prev.careerItems, ...newCareerItems]
    }));

    setShowCareerModal(false);
    setSelectedCareers([]);
    
    if (careersToAdd.length < selectedCareers.length) {
      alert(`${careersToAdd.length}개의 경력이 추가되었습니다. (일부는 이미 추가된 경력이었습니다.)`);
    } else {
      alert(`${careersToAdd.length}개의 경력이 추가되었습니다.`);
    }
  };

  const handleRemoveCareer = (index) => {
    setResumeData(prev => ({
      ...prev,
      careerItems: prev.careerItems.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCareerChange = (index, field, value) => {
    setResumeData(prev => ({
      ...prev,
      careerItems: prev.careerItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSavePDF = async () => {
    if (!resumeData.name || !resumeData.email) {
      alert("이름과 이메일은 필수입니다.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await axios.post(
        "/api/resume/generate-pdf",
        resumeData,
        { responseType: "blob" }
      );
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `이력서_${resumeData.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert("이력서가 저장되었습니다.");
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      alert("이력서 저장 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="resume-builder-container">
      <div className="resume-builder-header">
        <h1 className="resume-builder-title">이력서 작성</h1>
        <p className="resume-builder-subtitle">경력을 불러와 손쉽게 이력서를 작성하세요</p>
      </div>

      <div className="resume-form">
        {/* 기본 정보 */}
        <div className="form-section">
          <h2 className="section-title">기본 정보</h2>
          <div className="form-group">
            <label className="form-label">이름 *</label>
            <input
              type="text"
              className="form-input"
              value={resumeData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>
          <div className="form-group">
            <label className="form-label">이메일 *</label>
            <input
              type="email"
              className="form-input"
              value={resumeData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="이메일을 입력하세요"
            />
          </div>
          <div className="form-group">
            <label className="form-label">연락처</label>
            <input
              type="tel"
              className="form-input"
              value={resumeData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="연락처를 입력하세요"
            />
          </div>
          <div className="form-group">
            <label className="form-label">주소</label>
            <input
              type="text"
              className="form-input"
              value={resumeData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="주소를 입력하세요"
            />
          </div>
        </div>

        {/* 경력사항 */}
        <div className="form-section">
          <h2 className="section-title">경력사항</h2>
          
          {/* 경력 추가/불러오기 버튼 */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="add-career-btn"
              onClick={() => {
                setResumeData(prev => ({
                  ...prev,
                  careerItems: [...prev.careerItems, {
                    careerId: `manual_${Date.now()}`,
                    employerName: "",
                    position: "",
                    startDate: "",
                    endDate: "",
                    workMonths: 0
                  }]
                }));
              }}
              style={{ margin: 0 }}
            >
              + 경력 추가
            </button>
            
            {careers.length > 0 && (
              <button
                type="button"
                className="career-load-btn"
                onClick={() => setShowCareerModal(true)}
                style={{ 
                  margin: 0,
                  padding: "12px 24px",
                  fontSize: "14px"
                }}
              >
                경력 불러오기
              </button>
            )}
          </div>
          
          {/* 경력 불러오기 모달 */}
          {showCareerModal && (
            <div 
              onClick={(e) => {
                if (e.target.id === "career-load-modal-overlay") {
                  setShowCareerModal(false);
                  setSelectedCareers([]);
                }
              }}
              id="career-load-modal-overlay"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.8)",
                zIndex: 1000,
                padding: "20px",
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: "700px",
                  width: "100%",
                  background: "#111111",
                  border: "2px solid #10b981",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
                  maxHeight: "80vh",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  flexShrink: 0
                }}>
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#10b981" }}>경력 불러오기</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCareerModal(false);
                      setSelectedCareers([]);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                      color: "#10b981",
                      padding: "0",
                      width: "30px",
                      height: "30px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "opacity 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = "0.7"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                  >
                    ×
                  </button>
                </div>
                
                {loadingCareers ? (
                  <div className="loading-text" style={{ textAlign: "center", padding: "40px", color: "#10b981" }}>
                    경력을 불러오는 중...
                  </div>
                ) : (
                  <>
                    <div className="career-options" style={{ 
                      maxHeight: "400px", 
                      overflowY: "auto",
                      marginBottom: "20px",
                      flex: 1
                    }}>
                      {careers.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#10b981", opacity: 0.7 }}>
                          불러올 경력이 없습니다.
                        </div>
                      ) : (
                        careers.map((career) => {
                          const isAlreadyAdded = resumeData.careerItems.some(item => item.careerId === career.careerId);
                          const isSelected = selectedCareers.includes(career.careerId);
                          
                          return (
                            <div 
                              key={career.careerId} 
                              className="career-option-card"
                              onClick={() => !isAlreadyAdded && handleToggleCareerSelection(career.careerId)}
                              style={{
                                cursor: isAlreadyAdded ? "not-allowed" : "pointer",
                                opacity: isAlreadyAdded ? 0.5 : 1,
                                border: isSelected ? "2px solid #10b981" : "1px solid #10b981",
                                background: isSelected ? "rgba(16, 185, 129, 0.1)" : "#000000"
                              }}
                            >
                              <div className="career-option-content">
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                                  {!isAlreadyAdded && (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleCareerSelection(career.careerId)}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: "pointer",
                                        accentColor: "#10b981"
                                      }}
                                    />
                                  )}
                                  <div className="career-option-info" style={{ flex: 1 }}>
                                    <strong>{career.employerName}</strong>
                                    <span>{career.position}</span>
                                    <small>{career.startDate} ~ {career.endDate}</small>
                                  </div>
                                </div>
                                {isAlreadyAdded && (
                                  <span style={{
                                    padding: "4px 12px",
                                    background: "#1a1a1a",
                                    color: "#10b981",
                                    border: "1px solid #10b981",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: 500
                                  }}>
                                    추가됨
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: "16px",
                      borderTop: "1px solid #10b981",
                      flexShrink: 0
                    }}>
                      <div style={{ fontSize: "14px", color: "#10b981", opacity: 0.8 }}>
                        {selectedCareers.length}개 선택됨
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCareerModal(false);
                            setSelectedCareers([]);
                          }}
                          style={{
                            padding: "10px 20px",
                            background: "#000000",
                            color: "#10b981",
                            border: "1px solid #10b981",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "#0a0a0a";
                            e.target.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "#000000";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={handleLoadSelectedCareers}
                          disabled={selectedCareers.length === 0}
                          style={{
                            padding: "10px 20px",
                            background: selectedCareers.length > 0 ? "#10b981" : "#1a1a1a",
                            color: selectedCareers.length > 0 ? "#000000" : "#10b981",
                            border: "1px solid #10b981",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: selectedCareers.length > 0 ? "pointer" : "not-allowed",
                            opacity: selectedCareers.length > 0 ? 1 : 0.5,
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            if (selectedCareers.length > 0) {
                              e.target.style.background = "#059669";
                              e.target.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.5)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedCareers.length > 0) {
                              e.target.style.background = "#10b981";
                              e.target.style.boxShadow = "none";
                            }
                          }}
                        >
                          선택한 경력 불러오기 ({selectedCareers.length})
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 추가된 경력 목록 */}
          <div className="career-items-list">
            {resumeData.careerItems.map((career, index) => (
              <div key={index} className="career-item-card">
                <div className="career-item-header">
                  <span className="career-item-number">경력 {index + 1}</span>
                  <button
                    type="button"
                    className="career-remove-btn"
                    onClick={() => handleRemoveCareer(index)}
                  >
                    삭제
                  </button>
                </div>
                <div className="career-item-fields">
                  <div className="form-group">
                    <label className="form-label">회사명/직책</label>
                    <input
                      type="text"
                      className="form-input"
                      value={`${career.employerName} ${career.position}`}
                      onChange={(e) => {
                        const parts = e.target.value.split(" ");
                        handleCareerChange(index, "employerName", parts[0] || "");
                        handleCareerChange(index, "position", parts.slice(1).join(" ") || "");
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">근무기간</label>
                    <div className="date-group">
                      <input
                        type="date"
                        className="form-input"
                        value={career.startDate}
                        onChange={(e) => handleCareerChange(index, "startDate", e.target.value)}
                      />
                      <span className="date-separator">~</span>
                      <input
                        type="date"
                        className="form-input"
                        value={career.endDate}
                        onChange={(e) => handleCareerChange(index, "endDate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* 자기소개서 (선택) */}
        <div className="form-section">
          <h2 className="section-title">자기소개서 (선택)</h2>
          <div className="form-group">
            <textarea
              className="form-textarea"
              rows="8"
              value={resumeData.selfIntroduction}
              onChange={(e) => handleInputChange("selfIntroduction", e.target.value)}
              placeholder="자기소개서를 작성하세요 (선택사항)"
            />
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="resume-actions">
          <button
            className="save-pdf-btn"
            onClick={handleSavePDF}
            disabled={isSaving || !resumeData.name || !resumeData.email}
          >
            {isSaving ? "저장 중..." : "PDF로 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}


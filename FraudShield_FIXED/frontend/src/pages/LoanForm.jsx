import { useEffect, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./LoanForm.css";

function getErrorMessage(error, fallback) {
  const data = error.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data.error === "string") return data.error;
  return Object.values(data).filter(Boolean).join(". ") || fallback;
}

function LoanForm() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    api.get("/api/verification/status")
      .then((response) => {
        if (!response.data.identityVerified) {
          toast.error("Complete identity verification before applying.");
          navigate("/verify");
        }
      })
      .catch(() => {
        toast.error("Unable to confirm identity verification.");
        navigate("/verify");
      });
  }, [isAuthenticated, navigate]);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    age: "",
    nationalIdType: "",
    nationalIdNumber: "",
    nationality: "INDIAN",
    
    annualIncome: "",
    loanAmount: "",
    creditScore: "",
    existingLoans: "",
    
    employmentType: "",
    loanPurpose: "",
    
    // Location fields
    city: "",
    state: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = (currentStep) => {
    switch(currentStep) {
      case 1:
        if (!formData.fullName || !formData.email || !formData.age || !formData.city || !formData.state) {
          toast.error("Please fill all personal info fields");
          return false;
        }
        if (Number(formData.age) < 18) {
          toast.error("Applicant must be at least 18 years old");
          return false;
        }
        return true;
      case 2:
        if (!formData.annualIncome || !formData.loanAmount || !formData.creditScore || formData.existingLoans === "") {
          toast.error("Please fill all financial details");
          return false;
        }
        if (Number(formData.creditScore) < 300 || Number(formData.creditScore) > 900) {
          toast.error("Credit score must be between 300 and 900");
          return false;
        }
        if (Number(formData.loanAmount) <= 0) {
          toast.error("Enter a valid loan amount");
          return false;
        }
        return true;
      case 3:
        if (!formData.employmentType || !formData.loanPurpose) {
          toast.error("Please fill employment & purpose fields");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const submitLoan = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      toast.error("Please fix validation errors before submitting");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        age: Number(formData.age),
        annualIncome: Number(formData.annualIncome),
        loanAmount: Number(formData.loanAmount),
        creditScore: Number(formData.creditScore),
        existingLoans: Number(formData.existingLoans)
      };

      const response = await api.post("/api/loans", payload);
      setMlResult(response.data);
      setShowResults(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error(getErrorMessage(error, "Server Error. Check backend logs."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const identityBadgeColor = "var(--success)";


  if (showResults && mlResult) {
    const decisionColor = "var(--warning)";

    // ─── USER VIEW: Simple, clean result ───
    return (
      <div className="loan-page">
        <div className="results-container glass-card">
          <div className="results-header" style={{ flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px' }}>✓</div>
            <h2 style={{ fontSize: '28px' }}>
              Application Submitted Successfully
            </h2>
            <div className="decision-badge" style={{ backgroundColor: `${decisionColor}20`, color: decisionColor, border: `1px solid ${decisionColor}`, fontSize: '18px', padding: '10px 24px' }}>
              {mlResult.status?.replace(/_/g, ' ') || "UNDER REVIEW"}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px 40px', color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.7' }}>
            <p>Your application has been successfully submitted. Our fraud screening system is reviewing the information provided. You can track the status from My Applications.</p>
          </div>

          <div className="results-grid" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="result-details" style={{ width: '100%' }}>
              <h3>Application Summary</h3>
              <div className="detail-row">
                <span>Application ID</span>
                <strong>{mlResult.applicationId}</strong>
              </div>
              <div className="detail-row">
                <span>Loan Amount</span>
                <strong>₹{Number(mlResult.loanAmount).toLocaleString()}</strong>
              </div>
              <div className="detail-row">
                <span>Purpose</span>
                <strong>{mlResult.loanPurpose}</strong>
              </div>
              <div className="detail-row">
                <span>Identity</span>
                <span className="source-badge" style={{ color: "var(--success)" }}>{mlResult.identityVerified ? "✅ Verified" : "⏳ Pending"}</span>
              </div>
              <div className="detail-row">
                <span>Fraud Screening</span>
                <span className="source-badge" style={{ color: identityBadgeColor }}>
                  {mlResult.fraudScreeningStatus || mlResult.status?.replace(/_/g, ' ') || 'Under Review'}
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Application ID: {mlResult.applicationId} • Processed on {new Date().toLocaleDateString()}
          </div>
          
          <div className="results-actions">
            <Link to="/my-applications" className="btn-primary">My Applications</Link>
            <Link to="/" className="btn-outline">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loan-page">
      <div className="loan-header">
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
          <div className="step-labels">
            <span className={step >= 1 ? 'active' : ''}>Personal</span>
            <span className={step >= 2 ? 'active' : ''}>Financial</span>
            <span className={step >= 3 ? 'active' : ''}>Employment</span>
            <span className={step >= 4 ? 'active' : ''}>Review</span>
          </div>
        </div>
        <h1>Loan Application</h1>
        <p className="subtitle">Secure application with ML-powered fraud screening &amp; identity verification</p>
      </div>

      <div className="loan-container">
        <div className="loan-card glass-card">
          {step === 1 && (
            <div className="form-step slide-in">
              <h2>Step 1: Personal Information</h2>
              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="fullName">Full Name</label>
                  <input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. John Doe" />
                </div>
                <div className="input-group">
                  <label htmlFor="email">Email Address</label>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                </div>
                <div className="input-group">
                  <label htmlFor="age">Age</label>
                  <input id="age" name="age" type="number" value={formData.age} onChange={handleChange} placeholder="Min 18" />
                </div>
                <div className="input-group">
                  <label htmlFor="nationality">Nationality</label>
                  <select id="nationality" name="nationality" value={formData.nationality} onChange={handleChange}>
                    <option value="INDIAN">Indian</option>
                    <option value="FOREIGN">Foreign National</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="city">City</label>
                  <input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Mumbai" />
                </div>
                <div className="input-group">
                  <label htmlFor="state">State / Province</label>
                  <input id="state" name="state" value={formData.state} onChange={handleChange} placeholder="e.g. Maharashtra" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step slide-in">
              <h2>Step 2: Financial Details</h2>
              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="annualIncome">Annual Income (₹)</label>
                  <input id="annualIncome" name="annualIncome" type="number" value={formData.annualIncome} onChange={handleChange} placeholder="e.g. 1000000" />
                </div>
                <div className="input-group">
                  <label htmlFor="loanAmount">Requested Loan Amount (₹)</label>
                  <input id="loanAmount" name="loanAmount" type="number" value={formData.loanAmount} onChange={handleChange} placeholder="e.g. 500000" />
                </div>
                <div className="input-group">
                  <label htmlFor="creditScore">Credit Score (300-900)</label>
                  <input id="creditScore" name="creditScore" type="number" value={formData.creditScore} onChange={handleChange} placeholder="e.g. 750" />
                </div>
                <div className="input-group">
                  <label htmlFor="existingLoans">Existing Loan EMIs (₹/month)</label>
                  <input id="existingLoans" name="existingLoans" type="number" value={formData.existingLoans} onChange={handleChange} placeholder="e.g. 0" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step slide-in">
              <h2>Step 3: Employment & Purpose</h2>
              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="employmentType">Employment Type</label>
                  <select id="employmentType" name="employmentType" value={formData.employmentType} onChange={handleChange}>
                    <option value="">Select Employment Type</option>
                    <option value="SALARIED">Salaried</option>
                    <option value="BUSINESS">Business</option>
                    <option value="SELF_EMPLOYED">Self Employed</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="loanPurpose">Loan Purpose</label>
                  <select id="loanPurpose" name="loanPurpose" value={formData.loanPurpose} onChange={handleChange}>
                    <option value="">Select Loan Purpose</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="HOME">Home</option>
                    <option value="CAR">Car</option>
                    <option value="EDUCATION">Education</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step slide-in">
              <h2>Step 4: Review & Submit</h2>
              <div className="summary-grid">
                <div className="summary-section">
                  <div className="summary-header">
                    <h3>Personal Info</h3>
                    <button onClick={() => setStep(1)} className="btn-edit">Edit</button>
                  </div>
                  <p><strong>Name:</strong> {formData.fullName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Age:</strong> {formData.age}</p>
                  <p><strong>Identity:</strong> Verified before submission</p>
                  <p><strong>Location:</strong> {formData.city}, {formData.state}</p>
                </div>
                <div className="summary-section">
                  <div className="summary-header">
                    <h3>Financial Details</h3>
                    <button onClick={() => setStep(2)} className="btn-edit">Edit</button>
                  </div>
                  <p><strong>Income:</strong> ₹{Number(formData.annualIncome).toLocaleString()}</p>
                  <p><strong>Loan Amt:</strong> ₹{Number(formData.loanAmount).toLocaleString()}</p>
                  <p><strong>Credit Score:</strong> {formData.creditScore}</p>
                  <p><strong>Existing EMI:</strong> ₹{Number(formData.existingLoans).toLocaleString()}</p>
                </div>
                <div className="summary-section full-width">
                  <div className="summary-header">
                    <h3>Employment & Purpose</h3>
                    <button onClick={() => setStep(3)} className="btn-edit">Edit</button>
                  </div>
                  <p><strong>Employment:</strong> {formData.employmentType}</p>
                  <p><strong>Purpose:</strong> {formData.loanPurpose}</p>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 ? (
              <button onClick={prevStep} className="btn-secondary" disabled={isSubmitting}>Back</button>
            ) : (
              <div></div> /* Spacer */
            )}
            
            {step < 4 ? (
              <button onClick={nextStep} className="btn-primary">Next Step</button>
            ) : (
              <button onClick={submitLoan} className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? <div className="spinner" style={{width:'20px', height:'20px', margin:0}}></div> : "🚀 Submit Application"}
              </button>
            )}
          </div>
        </div>

        {/* Identity & Security Sidebar */}
        <div className="preview-card glass-card">
          <h2>🔒 Identity &amp; Security</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            The following checks are performed automatically during your application.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SecurityCheck
              done={true}
              label="Identity Verified (Aadhaar)"
              sublabel="Demo KYC — OCR extraction + manual check"
            />
            <SecurityCheck
              done={true}
              label="Mobile OTP Verified"
              sublabel="One-time password sent to registered number"
            />
            <SecurityCheck
              done={!!formData.city && !!formData.state}
              label="Location captured"
              sublabel={formData.city && formData.state ? `${formData.city}, ${formData.state}` : "Fill city/state in Step 1"}
            />
            <SecurityCheck
              done={true}
              label="Device fingerprint collected"
              sublabel="Browser device ID captured automatically"
            />
            <SecurityCheck
              done={true}
              label="Behavioral signals captured"
              sublabel="Application velocity &amp; session data for ML model"
            />
          </div>

          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
              <strong style={{ color: 'var(--info)' }}>ℹ️ How fraud screening works:</strong><br/>
              Our HistGradientBoosting ML model analyzes behavioral signals — not your credit score — to detect fraud.
              Your financial details are evaluated <em>separately</em> by the lending team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityCheck({ done, label, sublabel }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <span style={{
        width: "22px", height: "22px", borderRadius: "50%",
        background: done ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)",
        border: `2px solid ${done ? "var(--success)" : "var(--border-glass)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", flexShrink: 0, marginTop: "2px"
      }}>
        {done ? "✓" : "○"}
      </span>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: done ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{sublabel}</div>
      </div>
    </div>
  );
}

export default LoanForm;

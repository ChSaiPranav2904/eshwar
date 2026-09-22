import { useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./LoanForm.css";

function LoanForm() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mlResult, setMlResult] = useState(null);

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
    
    // Hidden behavioral signals for demo
    deviceKnown: "YES",
    locationRisk: "LOW"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = (currentStep) => {
    switch(currentStep) {
      case 1:
        if (!formData.fullName || !formData.email || !formData.age || !formData.nationalIdType || !formData.nationalIdNumber) {
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

      const response = await api.post("/loan", payload);
      setMlResult(response.data);
      setShowResults(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data || "Server Error. Check backend logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowResults(false);
    setMlResult(null);
    setStep(1);
    setFormData({
      fullName: "", email: "", age: "", nationalIdType: "", nationalIdNumber: "", nationality: "INDIAN",
      annualIncome: "", loanAmount: "", creditScore: "", existingLoans: "",
      employmentType: "", loanPurpose: "", deviceKnown: "YES", locationRisk: "LOW"
    });
  };

  const score = Number(formData.creditScore) || 0;
  const estimatedRisk = score >= 750 ? "LOW RISK" : score >= 650 ? "MEDIUM RISK" : "HIGH RISK";
  const riskColor = estimatedRisk === "LOW RISK" ? "var(--success)" : estimatedRisk === "MEDIUM RISK" ? "var(--warning)" : "var(--danger)";
  
  if (showResults && mlResult) {
    const mlPercent = mlResult.mlFraudProbability == null ? "N/A" : `${(mlResult.mlFraudProbability * 100).toFixed(1)}%`;
    const decisionColor = mlResult.decision === "APPROVED" ? "var(--success)" : mlResult.decision === "REJECTED" ? "var(--danger)" : "var(--warning)";
    
    return (
      <div className="loan-page">
        <div className="results-container glass-card">
          <div className="results-header">
            <h2>Analysis Complete</h2>
            <div className="decision-badge" style={{ backgroundColor: `${decisionColor}20`, color: decisionColor, border: `1px solid ${decisionColor}` }}>
              {mlResult.decision}
            </div>
          </div>
          
          <div className="results-grid">
            <div className="result-card">
              <h4>ML Fraud Probability</h4>
              <div className="gauge-container">
                <CircularProgressbar 
                  value={mlResult.mlFraudProbability * 100 || 0} 
                  text={mlPercent}
                  styles={buildStyles({
                    pathColor: mlResult.mlFraudProbability > 0.5 ? 'var(--danger)' : 'var(--success)',
                    textColor: 'var(--text-primary)',
                    trailColor: 'var(--border-glass)'
                  })}
                />
              </div>
              <p className="recommendation">ML Says: <strong style={{ color: mlResult.mlRecommendation === 'APPROVE' ? 'var(--success)' : 'var(--danger)' }}>{mlResult.mlRecommendation}</strong></p>
            </div>
            
            <div className="result-details">
              <h3>Decision Breakdown</h3>
              <div className="detail-row">
                <span>Final Risk Score</span>
                <strong>{mlResult.riskScore} / 100</strong>
              </div>
              <div className="detail-row">
                <span>Rule-based Score</span>
                <strong>{mlResult.ruleRiskScore ?? 'N/A'}</strong>
              </div>
              <div className="detail-row">
                <span>Decision Source</span>
                <span className="source-badge">{mlResult.decisionSource || 'RULES'}</span>
              </div>
              
              <div className="shap-explanation">
                <h4>SHAP Insights (Risk Factors)</h4>
                <p className="text-muted">High probability factors influencing this decision:</p>
                <div className="factors-list">
                  {mlResult.mlFraudProbability > 0.4 ? (
                    <>
                      <div className="factor-item danger">
                        <span>Low Credit Score</span>
                        <div className="bar-bg"><div className="bar-fill" style={{width: '85%'}}></div></div>
                      </div>
                      <div className="factor-item warning">
                        <span>High Loan-to-Income Ratio</span>
                        <div className="bar-bg"><div className="bar-fill" style={{width: '60%'}}></div></div>
                      </div>
                    </>
                  ) : (
                    <div className="factor-item success">
                      <span>Strong Financial Profile</span>
                      <div className="bar-bg"><div className="bar-fill" style={{width: '90%'}}></div></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="results-actions">
            <button onClick={resetForm} className="btn-primary">New Application</button>
            <Link to="/dashboard" className="btn-outline">Go to Dashboard</Link>
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
        <h1>Smart Loan Eligibility</h1>
        <p className="subtitle">AI Powered Credit Evaluation & Fraud Detection</p>
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
                  <label htmlFor="nationalIdType">ID Type</label>
                  <select id="nationalIdType" name="nationalIdType" value={formData.nationalIdType} onChange={handleChange}>
                    <option value="">Select ID Type</option>
                    <option value="AADHAAR">Aadhaar</option>
                    <option value="PAN">PAN</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="nationalIdNumber">ID Number</label>
                  <input id="nationalIdNumber" name="nationalIdNumber" value={formData.nationalIdNumber} onChange={handleChange} placeholder="Document Number" />
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
                <div className="input-group full-width demo-box">
                  <label>Fraud Engine Demo Signals (Hidden from real users)</label>
                  <div className="demo-inputs">
                    <select name="deviceKnown" value={formData.deviceKnown} onChange={handleChange}>
                      <option value="YES">Known Device (Safe)</option>
                      <option value="NO">Unknown Device (Risk)</option>
                    </select>
                    <select name="locationRisk" value={formData.locationRisk} onChange={handleChange}>
                      <option value="LOW">Low Location Risk</option>
                      <option value="MEDIUM">Medium Location Risk</option>
                      <option value="HIGH">High Location Risk</option>
                    </select>
                  </div>
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
                  <p><strong>ID:</strong> {formData.nationalIdType} - {formData.nationalIdNumber}</p>
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

        {/* Live Sidebar Preview */}
        <div className="preview-card glass-card">
          <h2>🤖 AI Risk Preview</h2>
          <div className="gauge-wrapper">
            <CircularProgressbar
              value={score}
              maxValue={900}
              text={`${score || 0}`}
              styles={buildStyles({
                textSize: "18px",
                pathColor: riskColor,
                textColor: riskColor,
                trailColor: "var(--border-glass)",
                strokeLinecap: "round",
              })}
            />
          </div>
          
          <div className="prediction-box" style={{ borderColor: riskColor, boxShadow: `0 0 20px ${riskColor}20` }}>
            <div className="prediction-label">ESTIMATED RISK</div>
            <div className="prediction-value" style={{ color: riskColor }}>
              {estimatedRisk}
            </div>
          </div>
          
          <div className="live-stats">
            <div className="stat-row">
              <span>Loan to Income</span>
              <strong>
                {formData.annualIncome && formData.loanAmount 
                  ? ((Number(formData.loanAmount) / Number(formData.annualIncome)) * 100).toFixed(1) + '%'
                  : '0%'}
              </strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ 
                width: `${Math.min(((Number(formData.loanAmount) / Number(formData.annualIncome)) * 100) || 0, 100)}%`,
                background: 'var(--info)'
              }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoanForm;

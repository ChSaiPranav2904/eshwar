import { useState } from "react";
import "./App.css";
import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar";

import "react-circular-progressbar/dist/styles.css";
function LoanForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [step, setStep] = useState(1);
  const [annualIncome, setAnnualIncome] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [existingLoans, setExistingLoans] = useState("");

 const [employmentType, setEmploymentType] =
  useState("");

  const [loanPurpose, setLoanPurpose] =
  useState("");
  const [nationality, setNationality] =
  useState("");
  const [nationalIdType, setNationalIdType] =
  useState("");

const [nationalIdNumber, setNationalIdNumber] =
  useState("");

const [idDocument, setIdDocument] =
  useState(null);

  // Demo behavioural signals used by the trained fraud model.
  const [deviceKnown, setDeviceKnown] = useState("YES");
  const [locationRisk, setLocationRisk] = useState("LOW");
  const nextStep = () => {
  if (step < 4) {
    setStep(step + 1);
  }
};

const prevStep = () => {
  if (step > 1) {
    setStep(step - 1);
  }
};

  const submitLoan = async () => {
    if (
  !fullName ||
  !email ||
  !age ||
  !annualIncome ||
  !loanAmount ||
  !creditScore ||
  !existingLoans ||
  !employmentType ||
  !loanPurpose ||
  !nationalIdType ||
  !nationalIdNumber
) {
  alert("Please fill all fields");
  return;
}if (Number(age) < 18) {
  alert("Applicant must be at least 18 years old");
  return;
}

if (Number(creditScore) < 300 || Number(creditScore) > 900) {
  alert("Credit score must be between 300 and 900");
  return;
}

if (Number(loanAmount) <= 0) {
  alert("Enter a valid loan amount");
  return;
}

if (Number(annualIncome) <= 0) {
  alert("Enter a valid annual income");
  return;
}if (
  !fullName ||
  !email ||
  !age ||
  !annualIncome ||
  !loanAmount ||
  !creditScore ||
  !existingLoans ||
  !employmentType ||
  !loanPurpose
) {
  alert("Please fill all fields");
  return;
}
    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:8087/loan",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
  fullName,
  email,
  nationality,
nationalIdType,
nationalIdNumber,
  age: Number(age),
  annualIncome: Number(annualIncome),
  loanAmount: Number(loanAmount),
  creditScore: Number(creditScore),
  existingLoans: Number(existingLoans),

  employmentType,
  loanPurpose,

  deviceKnown,
  locationRisk,
}),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const mlPercent = result.mlFraudProbability == null
          ? "N/A"
          : `${(result.mlFraudProbability * 100).toFixed(2)}%`;

        alert(
          `Loan Application Submitted Successfully\n\n` +
          `Rule Risk: ${result.ruleRiskScore ?? "N/A"}\n` +
          `ML Fraud Probability: ${mlPercent}\n` +
          `ML Recommendation: ${result.mlRecommendation ?? "N/A"}\n` +
          `Final Risk: ${result.riskScore ?? "N/A"}\n` +
          `Decision: ${result.decision}\n` +
          `Decision Source: ${result.decisionSource ?? "N/A"}`
        );

        setFullName("");
        setEmail("");
        

        setAge("");
        setAnnualIncome("");
        setLoanAmount("");
        setCreditScore("");
        setExistingLoans("");

       setEmploymentType("");

        setLoanPurpose("");
        
      } else {
        const error =
          await response.text();

        alert(
          "Failed: " + error
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        "Server Error. Check backend logs."
      );
    }
  };
const estimatedRisk =
  Number(creditScore) >= 750
    ? "LOW RISK"
    : Number(creditScore) >= 650
    ? "MEDIUM RISK"
    : "HIGH RISK";

const riskColor =
  estimatedRisk === "LOW RISK"
    ? "#22c55e"
    : estimatedRisk === "MEDIUM RISK"
    ? "#f59e0b"
    : "#ef4444";

const inputStyle = {
  background: "rgba(15,23,42,.8)",
  color: "#fff",

  border: "1px solid rgba(255,255,255,.08)",

  backdropFilter: "blur(12px)",

  padding: "18px 20px",

  borderRadius: "18px",

  fontSize: "15px",

  fontWeight: "500",

  width: "100%",

  outline: "none",

  transition: "all .25s ease",

  boxSizing: "border-box",
};
const score = Number(creditScore) || 0;

const scoreColor =
  score >= 750
    ? "#22c55e"
    : score >= 650
    ? "#f59e0b"
    : "#ef4444";
return (
  <div className="loan-page">
   <div className="loan-header">
    <div
  style={{
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto 40px auto",
  }}
>
  <div
    style={{
      height: "12px",
      background: "#1e293b",
      borderRadius: "20px",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${(step / 4) * 100}%`,
        height: "100%",
        background:
          "linear-gradient(90deg,#3b82f6,#8b5cf6)",
        transition: ".4s",
      }}
    />
  </div>
  <div
  className="loan-title"
  style={{
    fontSize: "72px",
    fontWeight: "800",
    letterSpacing: "-2px",
    lineHeight: "1",
  }}
>
  Smart Loan Eligibility
</div>

  <div className="loan-subtitle">
    AI Powered Credit Evaluation & Fraud Detection
  </div>
</div>



   <div className="loan-container">
      {/* FORM CARD */}

      <div className="loan-card">
        <h2
  style={{
    fontSize: "32px",
    fontWeight: "800",
    color: "white",
    marginBottom: "10px",
  }}
>
  Applicant Information
</h2>


  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginTop: "10px",
      color: "#94a3b8",
      fontSize: "14px",
    }}
  >
    <span>Personal</span>
    <span>Financial</span>
    <span>Employment</span>
    <span>Review</span>
  </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          <input
            style={inputStyle}
            placeholder="Full Name"
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
          />

          <input
            style={inputStyle}
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            style={inputStyle}
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) =>
              setAge(e.target.value)
            }
          />

          <input
            style={inputStyle}
            type="number"
            placeholder="Annual Income"
            value={annualIncome}
            onChange={(e) =>
              setAnnualIncome(e.target.value)
            }
          />

          <input
            style={inputStyle}
            type="number"
            placeholder="Loan Amount"
            value={loanAmount}
            onChange={(e) =>
              setLoanAmount(e.target.value)
            }
          />

          <input
            style={inputStyle}
            type="number"
            placeholder="Credit Score"
            value={creditScore}
            onChange={(e) =>
              setCreditScore(e.target.value)
            }
          />

          <input
            style={inputStyle}
            type="number"
            placeholder="Existing Loans"
            value={existingLoans}
            onChange={(e) =>
              setExistingLoans(e.target.value)
            }
          />

          <select
          style={inputStyle}
  value={employmentType}
  onChange={(e) =>
    setEmploymentType(e.target.value)
  }
>
  <option value="">
    Select Employment Type
  </option>

  <option value="SALARIED">
    Salaried
  </option>

  <option value="BUSINESS">
    Business
  </option>

  <option value="SELF_EMPLOYED">
    Self Employed
  </option>

  <option value="STUDENT">
    Student
  </option>
</select>

          <select
          style={inputStyle}
  value={loanPurpose}
  onChange={(e) =>
    setLoanPurpose(e.target.value)
  }
>
  <option value="">
    Select Loan Purpose
  </option>

  <option value="PERSONAL">
    Personal
  </option>

  <option value="HOME">
    Home
  </option>

  <option value="CAR">
    Car
  </option>

  <option value="EDUCATION">
    Education
  </option>

  <option value="BUSINESS">
    Business
  </option>
</select>
<select
  style={inputStyle}
  value={nationalIdType}
  onChange={(e) =>
    setNationalIdType(e.target.value)
  }
>
  <option value="">
    Select National ID Type
  </option>

  <option value="AADHAAR">
    Aadhaar
  </option>

  <option value="PAN">
    PAN
  </option>

  <option value="PASSPORT">
    Passport
  </option>

  <option value="DRIVING_LICENSE">
    Driving License
  </option>
</select>

<input
  style={inputStyle}
  placeholder="National ID Number"
  value={nationalIdNumber}
  onChange={(e) =>
    setNationalIdNumber(e.target.value)
  }
/>
<select
  style={inputStyle}
  value={nationality}
  onChange={(e) =>
    setNationality(e.target.value)
  }
>
  <option value="">
    Select Nationality
  </option>

  <option value="INDIAN">
    Indian
  </option>

  <option value="FOREIGN">
    Foreign National
  </option>
</select>
<select
  style={inputStyle}
  value={deviceKnown}
  onChange={(e) => setDeviceKnown(e.target.value)}
  title="Demo behavioural signal sent to the fraud model"
>
  <option value="YES">Known Device (normal)</option>
  <option value="NO">Unknown Device (fraud signal)</option>
</select>

<select
  style={inputStyle}
  value={locationRisk}
  onChange={(e) => setLocationRisk(e.target.value)}
  title="Demo behavioural signal sent to the fraud model"
>
  <option value="LOW">Low Location Risk</option>
  <option value="MEDIUM">Medium Location Risk</option>
  <option value="HIGH">High Location Risk</option>
</select>

<div
  style={{
    gridColumn: "1 / -1",
    color: "#94a3b8",
    fontSize: "12px",
    marginTop: "-4px",
  }}
>
  Demo behavioural signals above are evaluated by the trained fraud model.
</div>

<div
  style={{
    background: "#0f172a",
    border: "1px dashed #334155",
    borderRadius: "16px",
    padding: "18px",
    color: "#94a3b8",
  }}
>
  <input
    type="file"
    onChange={(e) =>
      setIdDocument(e.target.files[0])
    }
  />
</div>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "30px",
          }}
        >
          <button
            onClick={submitLoan}
            style={{
  background:
    "linear-gradient(135deg,#2563eb,#4f46e5,#7c3aed)",

  color: "white",

  padding: "20px 60px",

  borderRadius: "18px",

  border: "none",

  fontWeight: "800",

  fontSize: "18px",

  letterSpacing: ".5px",

  boxShadow:
    "0 20px 40px rgba(59,130,246,.35)",

  cursor: "pointer",
}}
          >
            🚀 Submit Application
          </button>
        </div>
      </div>

      {/* AI PREVIEW CARD */}

      <div className="preview-card">
        <h2
  style={{
    fontSize: "32px",
    fontWeight: "800",
    color: "white",
  }}
>
  🤖 AI Risk Preview
</h2>

  <div
  style={{
    display: "flex",
    justifyContent: "center",
    marginTop: "15px",
    marginBottom: "25px",
  }}
>
  <div
    style={{
      width: "220px",
      height: "220px",
    }}
  >
    <CircularProgressbar
      value={score}
      maxValue={900}
      text={`${score}`}
      styles={buildStyles({
        textSize: "16px",
        pathColor: scoreColor,
        textColor: scoreColor,
        trailColor: "#1e293b",
        strokeLinecap: "round",
      })}
    />
  </div>
</div>

     <div
  style={{
    marginTop: "25px",
    padding: "24px",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg,#111827,#1e293b)",
    border: `1px solid ${riskColor}`,
    textAlign: "center",
    boxShadow:
      `0 0 25px ${riskColor}30`,
  }}
>
  <div
    style={{
      color: "#94a3b8",
      fontSize: "12px",
      letterSpacing: "2px",
      marginBottom: "10px",
    }}
  >
    AI PREDICTION
  </div>

  <div
    style={{
      color: riskColor,
      fontSize: "28px",
      fontWeight: "800",
    }}
  >
    {estimatedRisk}
  </div>
</div>
  </div>
</div>

        <div style={{ marginTop: "30px" }}>

  {/* Income */}
  <div
    style={{
      marginBottom: "15px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "6px",
        color: "#cbd5e1",
      }}
    >
      <span>💰 Income</span>
      <span>
        ₹{Number(annualIncome || 0).toLocaleString()}
      </span>
    </div>

    <div
      style={{
        height: "8px",
        background: "#1e293b",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          width: `${Math.min(
            (Number(annualIncome || 0) / 2000000) * 100,
            100
          )}%`,
          height: "100%",
          background:
            "linear-gradient(90deg,#22c55e,#16a34a)",
          borderRadius: "10px",
        }}
      />
    </div>
  </div>

  {/* Loan */}
  <div
    style={{
      marginBottom: "15px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "6px",
        color: "#cbd5e1",
      }}
    >
      <span>🏦 Loan</span>
      <span>
        ₹{Number(loanAmount || 0).toLocaleString()}
      </span>
    </div>

    <div
      style={{
        height: "8px",
        background: "#1e293b",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          width: `${Math.min(
            (Number(loanAmount || 0) / 1000000) * 100,
            100
          )}%`,
          height: "100%",
          background:
            "linear-gradient(90deg,#3b82f6,#2563eb)",
          borderRadius: "10px",
        }}
      />
    </div>
  </div>

  {/* Employment */}
  <div
    style={{
      background: "#0f172a",
      padding: "12px",
      borderRadius: "12px",
      marginBottom: "12px",
      border: "1px solid #1e293b",
    }}
  >
    👔 Employment
    <div
      style={{
        marginTop: "6px",
        color: "#38bdf8",
        fontWeight: "bold",
      }}
    >
      {employmentType || "Not Selected"}
    </div>
  </div>

  {/* Purpose */}
  <div
    style={{
      background: "#0f172a",
      padding: "12px",
      borderRadius: "12px",
      border: "1px solid #1e293b",
    }}
  >
    📄 Loan Purpose
    <div
      style={{
        marginTop: "6px",
        color: "#a78bfa",
        fontWeight: "bold",
      }}
    >
      {loanPurpose || "Not Selected"}
    </div>
  </div>
<div
  style={{
    marginTop: "20px",
    background: "#0f172a",
    borderRadius: "16px",
    padding: "18px",
    border: "1px solid #1e293b",
  }}
>
  <h4
    style={{
      margin: 0,
      marginBottom: "12px",
      color: "white",
    }}
  >
    🚨 Fraud Signals
  </h4>

  <div style={{ color: "#cbd5e1", marginBottom: "8px" }}>
    {Number(creditScore) < 600
      ? "⚠ Low Credit Score"
      : "✅ Good Credit Score"}
  </div>

  <div style={{ color: "#cbd5e1", marginBottom: "8px" }}>
    {Number(existingLoans) > 3
      ? "⚠ Multiple Existing Loans"
      : "✅ Loan Count Normal"}
  </div>

  <div style={{ color: "#cbd5e1", marginBottom: "8px" }}>
    {nationalIdNumber
      ? "✅ National ID Provided"
      : "⚠ National ID Missing"}
  </div>

  <div style={{ color: "#cbd5e1" }}>
    {employmentType === "STUDENT"
      ? "⚠ Student Applicant"
      : "✅ Stable Employment"}
  </div>
</div>
</div>
      </div>
    </div>
  
);}
export default LoanForm;

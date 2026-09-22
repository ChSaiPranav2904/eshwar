import { Link } from "react-router-dom";

function TempLanding() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #0f172a, #020617)",
        color: "white",
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 80px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#3b82f6",
            fontWeight: "bold",
          }}
        >
          FraudShield AI
        </h2>

        <div
          style={{
            display: "flex",
            gap: "30px",
            alignItems: "center",
          }}
        >
          <Link
            to="/dashboard"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            Dashboard
          </Link>

          <Link
            to="/loan"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            Loan Application
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div
        style={{
          textAlign: "center",
          paddingTop: "120px",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "70px",
            marginBottom: "20px",
          }}
        >
          AI Fraud Detection System
        </h1>

        <p
          style={{
            fontSize: "22px",
            color: "#94a3b8",
            marginBottom: "50px",
          }}
        >
          Detect Fraud • Analyze Risk • Approve Loans
        </p>

        <div>
          <Link
            to="/dashboard"
            style={{
              padding: "15px 35px",
              background: "#2563eb",
              color: "white",
              textDecoration: "none",
              borderRadius: "10px",
              marginRight: "15px",
              fontWeight: "bold",
            }}
          >
            Open Dashboard
          </Link>

          <Link
            to="/loan"
            style={{
              padding: "15px 35px",
              background: "#16a34a",
              color: "white",
              textDecoration: "none",
              borderRadius: "10px",
              fontWeight: "bold",
            }}
          >
            Apply For Loan
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "25px",
          marginTop: "100px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "250px",
            padding: "30px",
            background: "#111827",
            borderRadius: "15px",
            border: "1px solid #1e293b",
            textAlign: "center",
          }}
        >
          <h2>10+</h2>
          <p style={{ color: "#94a3b8" }}>Transactions Processed</p>
        </div>

        <div
          style={{
            width: "250px",
            padding: "30px",
            background: "#111827",
            borderRadius: "15px",
            border: "1px solid #1e293b",
            textAlign: "center",
          }}
        >
          <h2>95%</h2>
          <p style={{ color: "#94a3b8" }}>Fraud Detection Accuracy</p>
        </div>

        <div
          style={{
            width: "250px",
            padding: "30px",
            background: "#111827",
            borderRadius: "15px",
            border: "1px solid #1e293b",
            textAlign: "center",
          }}
        >
          <h2>AI Powered</h2>
          <p style={{ color: "#94a3b8" }}>Risk Analysis Engine</p>
        </div>
      </div>

      {/* Features */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "30px",
          flexWrap: "wrap",
          marginTop: "100px",
          paddingBottom: "80px",
        }}
      >
        <div
          style={{
            width: "300px",
            padding: "30px",
            background: "#111827",
            borderRadius: "15px",
            border: "1px solid #1e293b",
          }}
        >
          <h2>🤖 AI Investigation</h2>
          <p style={{ color: "#94a3b8" }}>
            Generate AI-powered explanations for suspicious transactions.
          </p>
        </div>

        <div
          style={{
            width: "300px",
            padding: "30px",
            background: "#111827",
            borderRadius: "15px",
            border: "1px solid #1e293b",
          }}
        >
          <h2>⚡ Real-Time Monitoring</h2>
          <p style={{ color: "#94a3b8" }}>
            Analyze transactions instantly and identify risks.
          </p>
        </div>

        <div
          style={{
            width: "300px",
            padding: "30px",
            background: "#111827",
            borderRadius: "15px",
            border: "1px solid #1e293b",
          }}
        >
          <h2>🏦 Smart Loan Approval</h2>
          <p style={{ color: "#94a3b8" }}>
            Evaluate loan applications with fraud risk scoring.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TempLanding;
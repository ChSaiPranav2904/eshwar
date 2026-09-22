import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);

const [loadingAI, setLoadingAI] = useState(false);
const [aiReview, setAiReview] = useState("");
  const loadApplications = () => {
  const token = localStorage.getItem("token");

  fetch("http://localhost:8087/loan", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => res.json())
    .then((data) => setApplications(data))
    .catch((err) => console.error(err));
};
  useEffect(() => {
  loadApplications();
}, []);

const getAIReview = async (id) => {
  try {
    setShowModal(true);
    setLoadingAI(true);

    const token = localStorage.getItem("token");

const response = await fetch(
  `http://localhost:8087/loan/ai-review/${id}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
    const data = await response.text();

    setAiReview(data);
  } catch (error) {
    console.error(error);
    setAiReview("Failed to load AI review");
  } finally {
    setLoadingAI(false);
  }
};

const approvedCount = applications.filter(
  (app) => app.decision === "APPROVED"
).length;

  const rejectedCount = applications.filter(
    (app) => app.decision === "REJECTED"
  ).length;

  const reviewCount = applications.filter(
    (app) => app.decision === "MANUAL_REVIEW"
  ).length;

  const avgRisk =
    applications.length > 0
      ? (
          applications.reduce(
            (sum, app) => sum + (app.riskScore || 0),
            0
          ) / applications.length
        ).toFixed(1)
      : 0;
const chartData = [
  {
    name: "Approved",
    value: approvedCount,
  },
  {
    name: "Rejected",
    value: rejectedCount,
  },
  {
    name: "Review",
    value: reviewCount,
  },
];const riskDistribution = [
  {
    range: "0-20",
    count: applications.filter(
      (a) => a.riskScore <= 20
    ).length,
  },
  {
    range: "21-40",
    count: applications.filter(
      (a) => a.riskScore > 20 &&
             a.riskScore <= 40
    ).length,
  },
  {
    range: "41-70",
    count: applications.filter(
      (a) => a.riskScore > 40 &&
             a.riskScore <= 70
    ).length,
  },
  {
    range: "71-100",
    count: applications.filter(
      (a) => a.riskScore > 70
    ).length,
  },
];
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.fullName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all"
        ? true
        : filterType === "approved"
        ? app.decision === "APPROVED"
        : filterType === "rejected"
        ? app.decision === "REJECTED"
        : app.decision === "MANUAL_REVIEW";

    return matchesSearch && matchesFilter;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "30px",
      }}
    >
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "15px",
        }}
      >
        <h2>🏦 Loan Risk Dashboard</h2>

        <div
  style={{
    display: "flex",
    gap: "20px",
    alignItems: "center",
  }}
>
  <Link
    to="/"
    style={{
      color: "white",
      textDecoration: "none",
    }}
  >
    Home
  </Link>

  <Link
    to="/loan"
    style={{
      color: "white",
      textDecoration: "none",
    }}
  >
    Apply Loan
  </Link>

  <button
    onClick={() => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }}
    style={{
      background: "#dc2626",
      color: "white",
      border: "none",
      padding: "10px 16px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    Logout
  </button>
</div>
      </nav>

      <h1 style={{ marginBottom: "10px" }}>
        Loan Risk Assessment Dashboard
      </h1>

      <p
        style={{
          color: "#94a3b8",
          marginBottom: "30px",
        }}
      >
        Real-time monitoring of loan applications
      </p>

      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "30px",
        }}
      >
        <Card
          title="📄 Applications"
          value={applications.length}
        />

        <Card
          title="✅ Approved"
          value={approvedCount}
        />

        <Card
          title="❌ Rejected"
          value={rejectedCount}
        />

        <Card
          title="⚠ Manual Review"
          value={reviewCount}
        />

        <Card
          title="📊 Avg Risk"
          value={avgRisk}
        />
      </div>
<div
  style={{
    display: "flex",
    gap: "20px",
    marginBottom: "30px",
    flexWrap: "wrap",
  }}
>
  <div
    style={{
      background: "#111827",
      padding: "20px",
      borderRadius: "16px",
      width: "450px",
      height: "320px",
    }}
  >
    <h3>📊 Loan Decisions</h3>

    <ResponsiveContainer
      width="100%"
      height="90%"
    >
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          outerRadius={100}
          label
        >
          <Cell fill="#22c55e" />
          <Cell fill="#ef4444" />
          <Cell fill="#f59e0b" />
        </Pie>

        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>

  <div
    style={{
      background: "#111827",
      padding: "20px",
      borderRadius: "16px",
      width: "550px",
      height: "320px",
    }}
  >
    <h3>📈 Risk Distribution</h3>

    <ResponsiveContainer
      width="100%"
      height="90%"
    >
      <BarChart data={riskDistribution}>
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="range" />

        <YAxis />

        <Tooltip />

        <Bar
          dataKey="count"
          fill="#3b82f6"
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
      <div
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          placeholder="Search Applicant..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
          style={{
            padding: "12px",
            width: "300px",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#111827",
            color: "white",
          }}
        />

        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value)
          }
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: "#111827",
            color: "white",
            border: "1px solid #334155",
          }}
        >
          <option value="all">
            All Applications
          </option>

          <option value="approved">
            Approved
          </option>

          <option value="rejected">
            Rejected
          </option>

          <option value="review">
            Manual Review
          </option>
        </select>

        <button
          onClick={loadApplications}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 20px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#111827",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <thead
          style={{
            background: "#1e293b",
          }}
        >
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Income</th>
            <th>Loan</th>
            <th>Credit</th>
            <th>Employment</th>
            <th>Rule Risk</th>
            <th>ML Fraud</th>
            <th>Final Risk</th>
            <th>Source</th>
            <th>Decision</th>
            <th>Status</th>
            <th>AI Review</th>
          </tr>
        </thead>

        <tbody>
          {filteredApplications.map((app) => (
            <tr
              key={app.id}
              style={{
                textAlign: "center",
                borderBottom:
                  "1px solid #1e293b",
              }}
            >
              <td>{app.id}</td>

              <td>{app.fullName}</td>

              <td>
                ₹
                {app.annualIncome?.toLocaleString()}
              </td>

              <td>
                ₹
                {app.loanAmount?.toLocaleString()}
              </td>

              <td>{app.creditScore}</td>

              <td>{app.employmentType}</td>

              <td>{app.ruleRiskScore ?? app.riskScore}</td>

              <td>
                {app.mlFraudProbability == null
                  ? "N/A"
                  : `${(app.mlFraudProbability * 100).toFixed(2)}%`}
              </td>

              <td>{app.riskScore}</td>

              <td style={{ fontSize: "11px" }}>
                {app.decisionSource || "RULES"}
              </td>

              <td>
                <strong>
                  {app.decision}
                </strong>
              </td>

              <td>{app.status}</td>
              <td>
  <button
    onClick={() => getAIReview(app.id)}
    style={{
      background: "#2563eb",
      color: "white",
      border: "none",
      padding: "8px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    🤖 Review
  </button>
</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        width: "900px",
        maxWidth: "90%",
        maxHeight: "80vh",
        overflowY: "auto",
        background: "#111827",
        padding: "30px",
        borderRadius: "16px",
        color: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      <h2>🤖 AI Loan Risk Analysis</h2>

      {loadingAI ? (
  <div
    style={{
      textAlign: "center",
      padding: "50px",
    }}
  >
    <div className="spinner"></div>

    <h3>🤖 AI is analyzing this loan...</h3>

    <p
      style={{
        color: "#94a3b8",
      }}
    >
      Evaluating risk profile, fraud indicators
      and approval recommendation.
    </p>
  </div>
) : (
        <div
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: "1.8",
            marginTop: "20px",
          }}
        >
          {aiReview}
        </div>
      )}

      <button
        onClick={() => setShowModal(false)}
        style={{
          marginTop: "20px",
          background: "#dc2626",
          color: "white",
          border: "none",
          padding: "12px 20px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        background: "#111827",
        padding: "20px",
        width: "220px",
        borderRadius: "14px",
        boxShadow:
          "0 8px 20px rgba(0,0,0,0.3)",
      }}
    >
      <h3>{title}</h3>
      <h1>{value}</h1>
    </div>
  );
}

export default Dashboard;
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { logout } = useAuth();

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/admin/applications");
      setApplications(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load applications. Please try again.");
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadApplications();
  }, [loadApplications]);

  // Use fraudDecision (new field) with fallback to decision (legacy)
  const getDecision = (app) => app.fraudDecision || app.decision || "UNKNOWN";

  const reviewCount  = applications.filter(app => getDecision(app) === "MANUAL_REVIEW").length;
  const lowRiskCount = applications.filter(app => getDecision(app) === "LOW_RISK").length;
  const highRiskCount = applications.filter(app => getDecision(app) === "HIGH_RISK").length;
  const avgFraudRisk = applications.length > 0
    ? (applications.reduce((sum, app) => sum + (app.finalFraudRiskScore ?? app.riskScore ?? 0), 0) / applications.length).toFixed(1)
    : 0;

  const chartData = [
    { name: "Low Risk",      value: lowRiskCount },
    { name: "Manual Review", value: reviewCount },
    { name: "High Risk",     value: highRiskCount },
  ];

  const riskDistribution = [
    { range: "0-20",  count: applications.filter(a => (a.finalFraudRiskScore ?? a.riskScore ?? 0) <= 20).length },
    { range: "21-40", count: applications.filter(a => { const s = a.finalFraudRiskScore ?? a.riskScore ?? 0; return s > 20 && s <= 40; }).length },
    { range: "41-65", count: applications.filter(a => { const s = a.finalFraudRiskScore ?? a.riskScore ?? 0; return s > 40 && s <= 65; }).length },
    { range: "66-100", count: applications.filter(a => (a.finalFraudRiskScore ?? a.riskScore ?? 0) > 65).length },
  ];

  const filteredApplications = applications.filter((app) => {
    const matchesSearch = app.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const dec = getDecision(app);
    const matchesFilter = filterType === "all"    ? true
      : filterType === "low"    ? dec === "LOW_RISK"
      : filterType === "high"   ? dec === "HIGH_RISK"
      : filterType === "pending" ? app.status === "UNDER_FRAUD_REVIEW"
      : filterType === "held"    ? app.status === "HELD_FOR_INVESTIGATION"
      : dec === "MANUAL_REVIEW";
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav glass-card">
        <h2>🛡️ FraudShield AI Dashboard</h2>
        <div className="nav-actions">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/loan" className="nav-link">Apply Loan</Link>
          <Link to="/my-applications" className="nav-link">My Applications</Link>
          <button onClick={logout} className="btn-danger">Logout</button>
        </div>
      </nav>

      <header className="dashboard-header">
        <h1>Fraud Assessment Dashboard</h1>
        <p>Real-time fraud risk monitoring — Powered by HistGradientBoosting ML + IsolationForest</p>
      </header>

      {error ? (
        <div className="error-state glass-card">
          <p>{error}</p>
          <button onClick={loadApplications} className="btn-primary">Retry</button>
        </div>
      ) : loading ? (
        <div className="skeleton-container">
          <div className="skeleton-cards">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-card glass-card"></div>)}
          </div>
          <div className="skeleton-charts">
            <div className="skeleton-chart glass-card"></div>
            <div className="skeleton-chart glass-card"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="stats-container">
            <Card title="📄 Applications"   value={applications.length} />
            <Card title="✅ Low Fraud Risk"  value={lowRiskCount} />
            <Card title="⚠ Manual Review"   value={reviewCount} />
            <Card title="🚨 High Risk"       value={highRiskCount} />
            <Card title="📊 Avg Fraud Risk"  value={`${avgFraudRisk}%`} />
          </div>

          <div className="charts-container">
            <div className="chart-card glass-card">
              <h3>📊 Fraud Decisions</h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" outerRadius={100} label>
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card glass-card">
              <h3>📈 Fraud Risk Distribution</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="range" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-controls">
            <input
              type="text"
              placeholder="Search Applicant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Applications</option>
              <option value="low">Low Fraud Risk</option>
              <option value="review">Manual Review</option>
              <option value="high">High Risk</option>
              <option value="pending">Under Review</option>
              <option value="held">Held for Investigation</option>
            </select>
            <button onClick={loadApplications} className="btn-primary">Refresh</button>
          </div>

          <div className="table-wrapper glass-card">
            {filteredApplications.length > 0 ? (
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Loan Amount</th>
                    <th>ML Fraud Prob</th>
                    <th>Anomaly Score</th>
                    <th>Identity Risk</th>
                    <th>Device Risk</th>
                    <th>Final Fraud Score</th>
                    <th>Source</th>
                    <th>Fraud Decision</th>
                    <th>Identity</th>
                    <th>Status</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr key={app.id}>
                      <td>{app.id}</td>
                      <td className="font-medium">{app.fullName}</td>
                      <td>₹{app.loanAmount?.toLocaleString()}</td>
                      <td>
                        {app.mlFraudProbability == null
                          ? "N/A"
                          : `${(app.mlFraudProbability * 100).toFixed(2)}%`}
                      </td>
                      <td>
                        {app.anomalyScore == null
                          ? "N/A"
                          : app.anomalyScore.toFixed(4)}
                      </td>
                      <td>{app.identityRiskScore != null ? app.identityRiskScore.toFixed(0) : "—"}</td>
                      <td>{app.deviceRiskScore != null ? app.deviceRiskScore.toFixed(0) : "—"}</td>
                      <td className="font-bold">
                        {(app.finalFraudRiskScore ?? app.riskScore ?? "—")}
                      </td>
                      <td className="text-xs">{app.decisionSource || "RULES"}</td>
                      <td>
                        <span className={`badge badge-${getDecision(app)?.toLowerCase().replace("_", "-")}`}>
                          {getDecision(app)?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>{app.identityVerified ? "✓ Verified" : "✗ Pending"}</td>
                      <td>{app.status?.replace(/_/g, " ")}</td>
                      <td>
                        <Link to={`/dashboard/${app.id}`} className="btn-review">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No applications found.</p>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: "16px 24px", marginTop: "16px", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.6" }}>
            <strong>ℹ️ Fraud Assessment Note:</strong> The Fraud Risk Score is driven primarily by the
            <strong> HistGradientBoosting ML model</strong> (weight 0.55) with supporting behavioral signals.
            Credit score, income, and employment type are <strong>NOT</strong> fraud indicators — they are
            evaluated separately by the lending team.
            A low fraud risk score means <em>"No significant fraud indicators detected."</em>
            It does <strong>NOT</strong> mean <em>"Loan approved."</em>
          </div>
        </>
      )}

    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="stat-card-small glass-card">
      <h3>{title}</h3>
      <h1>{value}</h1>
    </div>
  );
}

export default Dashboard;

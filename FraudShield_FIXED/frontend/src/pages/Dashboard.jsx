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
    loadApplications();
  }, [loadApplications]);

  const getDecision = (app) => app.fraudDecision || app.decision || "UNKNOWN";

  const reviewCount   = applications.filter(app => getDecision(app) === "MANUAL_REVIEW").length;
  const lowRiskCount  = applications.filter(app => getDecision(app) === "LOW_RISK").length;
  const highRiskCount = applications.filter(app => getDecision(app) === "HIGH_RISK").length;
  const avgFraudRisk  = applications.length > 0
    ? (applications.reduce((sum, app) => sum + (app.finalFraudRiskScore ?? app.riskScore ?? 0), 0) / applications.length).toFixed(1)
    : 0;

  const chartData = [
    { name: "Low Risk",      value: lowRiskCount  },
    { name: "Manual Review", value: reviewCount   },
    { name: "High Risk",     value: highRiskCount },
  ];

  const riskDistribution = [
    { range: "0–20",   count: applications.filter(a => (a.finalFraudRiskScore ?? a.riskScore ?? 0) <= 20).length },
    { range: "21–40",  count: applications.filter(a => { const s = a.finalFraudRiskScore ?? a.riskScore ?? 0; return s > 20 && s <= 40; }).length },
    { range: "41–65",  count: applications.filter(a => { const s = a.finalFraudRiskScore ?? a.riskScore ?? 0; return s > 40 && s <= 65; }).length },
    { range: "66–100", count: applications.filter(a => (a.finalFraudRiskScore ?? a.riskScore ?? 0) > 65).length },
  ];

  const filteredApplications = applications.filter((app) => {
    const matchesSearch = app.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const dec = getDecision(app);
    const matchesFilter = filterType === "all"     ? true
      : filterType === "low"     ? dec === "LOW_RISK"
      : filterType === "high"    ? dec === "HIGH_RISK"
      : filterType === "pending" ? app.status === "UNDER_FRAUD_REVIEW"
      : filterType === "held"    ? app.status === "HELD_FOR_INVESTIGATION"
      : dec === "MANUAL_REVIEW";
    return matchesSearch && matchesFilter;
  });

  const tooltipStyle = { background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px' };

  return (
    <div className="dashboard-page">
      {/* Nav */}
      <nav className="dashboard-nav">
        <h2>🛡️ FraudShield AI</h2>
        <div className="nav-actions">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/loan" className="nav-link">Apply Loan</Link>
          <Link to="/my-applications" className="nav-link">My Applications</Link>
          <button onClick={logout} className="btn-danger">Logout</button>
        </div>
      </nav>

      {error ? (
        <div className="skeleton-container">
          <div className="error-state glass-card">
            <p>{error}</p>
            <button onClick={loadApplications} className="btn-primary">Retry</button>
          </div>
        </div>
      ) : loading ? (
        <div className="skeleton-container">
          <div className="skeleton-cards">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-card glass-card" />)}
          </div>
          <div className="skeleton-charts">
            <div className="skeleton-chart glass-card" />
            <div className="skeleton-chart glass-card" />
          </div>
        </div>
      ) : (
        <div className="dashboard-body">
          <div className="dashboard-header">
            <h1>Fraud Assessment Dashboard</h1>
            <p>Real-time monitoring — HistGradientBoosting ML + IsolationForest</p>
          </div>

          {/* Stats */}
          <div className="stats-container">
            <Card label="Total Applications" value={applications.length} />
            <Card label="Low Fraud Risk"     value={lowRiskCount}   color="var(--success)" />
            <Card label="Manual Review"      value={reviewCount}    color="var(--warning)" />
            <Card label="High Risk"          value={highRiskCount}  color="var(--danger)"  />
            <Card label="Avg Fraud Score"    value={`${avgFraudRisk}%`} />
          </div>

          {/* Charts */}
          <div className="charts-container">
            <div className="chart-card glass-card">
              <h3>Fraud Decisions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" outerRadius={90} innerRadius={40} paddingAngle={3} label={({ name, percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card glass-card">
              <h3>Risk Score Distribution</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistribution} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Controls */}
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search by applicant name…"
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
            <button onClick={loadApplications} className="btn-primary">↻ Refresh</button>
          </div>

          {/* Table */}
          <div className="table-wrapper glass-card">
            {filteredApplications.length > 0 ? (
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Applicant</th>
                    <th>Loan Amount</th>
                    <th>ML Fraud Prob</th>
                    <th>Anomaly Score</th>
                    <th>Identity Risk</th>
                    <th>Device Risk</th>
                    <th>Final Score</th>
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
                          ? "—"
                          : `${(app.mlFraudProbability * 100).toFixed(2)}%`}
                      </td>
                      <td>
                        {app.anomalyScore == null ? "—" : app.anomalyScore.toFixed(4)}
                      </td>
                      <td>{app.identityRiskScore != null ? app.identityRiskScore.toFixed(0) : "—"}</td>
                      <td>{app.deviceRiskScore   != null ? app.deviceRiskScore.toFixed(0)   : "—"}</td>
                      <td className="font-bold">
                        {(app.finalFraudRiskScore ?? app.riskScore ?? "—")}
                      </td>
                      <td className="text-xs">{app.decisionSource || "RULES"}</td>
                      <td>
                        <span className={`badge badge-${getDecision(app)?.toLowerCase().replace(/_/g, "-")}`}>
                          {getDecision(app)?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ color: app.identityVerified ? "var(--success)" : "var(--text-muted)" }}>
                        {app.identityVerified ? "✓ Verified" : "⏳ Pending"}
                      </td>
                      <td className="text-xs">{app.status?.replace(/_/g, " ")}</td>
                      <td>
                        <Link to={`/dashboard/${app.id}`} className="btn-review">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                No applications match your filter.
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="info-note">
            <strong>ℹ️ Fraud Score Note:</strong> The Final Fraud Risk Score is driven primarily by the
            <strong> HistGradientBoosting ML model</strong> (weight 0.55) with supporting behavioral signals.
            Credit score, income, and employment type are <strong>not</strong> fraud indicators — they are evaluated
            separately by the lending team. A low fraud score means no significant fraud indicators were detected,
            not that the loan is approved.
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div className="stat-card-small glass-card">
      <h3>{label}</h3>
      <h1 style={color ? { color } : {}}>{value}</h1>
    </div>
  );
}

export default Dashboard;

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
  const [showModal, setShowModal] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiReview, setAiReview] = useState("");
  const { logout } = useAuth();

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/loan");
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

  // Focus trap and escape key for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showModal) {
        setShowModal(false);
      }
    };
    if (showModal) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [showModal]);

  const getAIReview = async (id) => {
    try {
      setShowModal(true);
      setLoadingAI(true);
      const response = await api.get(`/loan/ai-review/${id}`);
      setAiReview(response.data);
    } catch (error) {
      console.error(error);
      setAiReview("Failed to load AI review.");
      toast.error("Failed to load AI review.");
    } finally {
      setLoadingAI(false);
    }
  };

  const approvedCount = applications.filter(app => app.decision === "APPROVED").length;
  const rejectedCount = applications.filter(app => app.decision === "REJECTED").length;
  const reviewCount = applications.filter(app => app.decision === "MANUAL_REVIEW").length;
  const avgRisk = applications.length > 0
    ? (applications.reduce((sum, app) => sum + (app.riskScore || 0), 0) / applications.length).toFixed(1)
    : 0;

  const chartData = [
    { name: "Approved", value: approvedCount },
    { name: "Rejected", value: rejectedCount },
    { name: "Review", value: reviewCount },
  ];

  const riskDistribution = [
    { range: "0-20", count: applications.filter(a => a.riskScore <= 20).length },
    { range: "21-40", count: applications.filter(a => a.riskScore > 20 && a.riskScore <= 40).length },
    { range: "41-70", count: applications.filter(a => a.riskScore > 40 && a.riskScore <= 70).length },
    { range: "71-100", count: applications.filter(a => a.riskScore > 70).length },
  ];

  const filteredApplications = applications.filter((app) => {
    const matchesSearch = app.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" ? true
      : filterType === "approved" ? app.decision === "APPROVED"
      : filterType === "rejected" ? app.decision === "REJECTED"
      : app.decision === "MANUAL_REVIEW";
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav glass-card">
        <h2>🏦 Loan Risk Dashboard</h2>
        <div className="nav-actions">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/loan" className="nav-link">Apply Loan</Link>
          <button onClick={logout} className="btn-danger">Logout</button>
        </div>
      </nav>

      <header className="dashboard-header">
        <h1>Loan Risk Assessment Dashboard</h1>
        <p>Real-time monitoring of loan applications</p>
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
            <Card title="📄 Applications" value={applications.length} />
            <Card title="✅ Approved" value={approvedCount} />
            <Card title="❌ Rejected" value={rejectedCount} />
            <Card title="⚠ Manual Review" value={reviewCount} />
            <Card title="📊 Avg Risk" value={avgRisk} />
          </div>

          <div className="charts-container">
            <div className="chart-card glass-card">
              <h3>📊 Loan Decisions</h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" outerRadius={100} label>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card glass-card">
              <h3>📈 Risk Distribution</h3>
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
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="review">Manual Review</option>
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
                    <tr key={app.id}>
                      <td>{app.id}</td>
                      <td className="font-medium">{app.fullName}</td>
                      <td>₹{app.annualIncome?.toLocaleString()}</td>
                      <td>₹{app.loanAmount?.toLocaleString()}</td>
                      <td>{app.creditScore}</td>
                      <td>{app.employmentType}</td>
                      <td>{app.ruleRiskScore ?? app.riskScore}</td>
                      <td>
                        {app.mlFraudProbability == null
                          ? "N/A"
                          : `${(app.mlFraudProbability * 100).toFixed(2)}%`}
                      </td>
                      <td className="font-bold">{app.riskScore}</td>
                      <td className="text-xs">{app.decisionSource || "RULES"}</td>
                      <td>
                        <span className={`badge badge-${app.decision.toLowerCase()}`}>
                          {app.decision}
                        </span>
                      </td>
                      <td>{app.status}</td>
                      <td>
                        <button onClick={() => getAIReview(app.id)} className="btn-review">
                          🤖 Review
                        </button>
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
        </>
      )}

      {showModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤖 AI Loan Risk Analysis</h2>
              <button className="btn-close" onClick={() => setShowModal(false)} aria-label="Close modal">×</button>
            </div>
            
            {loadingAI ? (
              <div className="modal-loading">
                <div className="spinner"></div>
                <h3>AI is analyzing this loan...</h3>
                <p>Evaluating risk profile, fraud indicators and approval recommendation.</p>
              </div>
            ) : (
              <div className="modal-body">
                {aiReview}
              </div>
            )}
            
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-danger">Close</button>
            </div>
          </div>
        </div>
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
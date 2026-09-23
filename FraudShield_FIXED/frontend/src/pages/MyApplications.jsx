import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import "./Dashboard.css";

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/loans/my")
      .then((response) => setApplications(response.data))
      .catch(() => toast.error("Unable to load your applications"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard-page">
      {/* Nav */}
      <nav className="dashboard-nav">
        <h2>📋 My Applications</h2>
        <div className="nav-actions">
          <Link to="/verify" className="nav-link">Identity</Link>
          <Link to="/loan" className="nav-link">Apply Loan</Link>
          <Link to="/" className="nav-link">Home</Link>
        </div>
      </nav>

      <div className="dashboard-body">
        <div className="dashboard-header">
          <h1>My Loan Applications</h1>
          <p>Track the status of your submitted applications</p>
        </div>

        {loading ? (
          <div className="skeleton-card glass-card" style={{ height: 200 }} />
        ) : applications.length === 0 ? (
          <div className="empty-state glass-card" style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
            <p>No applications submitted yet.</p>
            <Link to="/loan" className="btn-primary">Start an Application</Link>
          </div>
        ) : (
          <div className="table-wrapper glass-card">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Loan Amount</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Identity</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="font-medium">{app.applicationId}</td>
                    <td>₹{Number(app.loanAmount).toLocaleString()}</td>
                    <td>
                      {app.submittedDate
                        ? new Date(app.submittedDate).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td>
                      <span className="badge badge-manual-review" style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc", borderColor: "rgba(99,102,241,0.25)" }}>
                        {app.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ color: app.identityVerified ? "var(--success)" : "var(--text-muted)" }}>
                      {app.identityVerified ? "✓ Verified" : "⏳ Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyApplications;

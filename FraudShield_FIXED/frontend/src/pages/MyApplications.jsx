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
      <nav className="dashboard-nav glass-card">
        <h2>My Applications</h2>
        <div className="nav-actions">
          <Link to="/verify" className="nav-link">Identity</Link>
          <Link to="/loan" className="nav-link">Apply Loan</Link>
          <Link to="/" className="nav-link">Home</Link>
        </div>
      </nav>

      {loading ? (
        <div className="skeleton-card glass-card"></div>
      ) : applications.length === 0 ? (
        <div className="empty-state glass-card">
          <p>No applications submitted yet.</p>
          <Link to="/loan" className="btn-primary">Start Application</Link>
        </div>
      ) : (
        <div className="table-wrapper glass-card">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Loan Amount</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th>Identity</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.applicationId}</td>
                  <td>₹{Number(app.loanAmount).toLocaleString()}</td>
                  <td>{app.submittedDate ? new Date(app.submittedDate).toLocaleString() : "Processing"}</td>
                  <td><span className="source-badge">{app.status?.replace(/_/g, " ")}</span></td>
                  <td>{app.identityVerified ? "Verified" : "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MyApplications;

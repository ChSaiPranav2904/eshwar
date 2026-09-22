import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import toast from "react-hot-toast";
import api from "../services/api";
import "./LoanForm.css";
import "./Dashboard.css";

function AdminApplicationDetail() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/admin/applications/${id}/fraud-analysis`)
      .then((response) => setAnalysis(response.data))
      .catch(() => toast.error("Unable to load fraud analysis"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="dashboard-page"><div className="skeleton-card glass-card"></div></div>;
  }

  if (!analysis) {
    return <div className="dashboard-page"><div className="empty-state glass-card">Analysis unavailable</div></div>;
  }

  const app = analysis.application;
  const probability = Number(app.mlFraudProbability || 0) * 100;
  const probabilityText = probability < 1 ? probability.toFixed(2) : probability.toFixed(1);
  const pipelineEntries = Object.entries(analysis.pipeline || {});

  return (
    <div className="loan-page">
      <div className="results-container glass-card">
        <div className="results-header">
          <div>
            <h2>Fraud Analysis</h2>
            <p className="subtitle">Application FS-2026-{String(app.id).padStart(5, "0")}</p>
          </div>
          <Link to="/dashboard" className="btn-outline">Back to Dashboard</Link>
        </div>

        <div className="results-grid">
          <div className="result-card">
            <h4>ML Fraud Probability</h4>
            <div className="gauge-container">
              <CircularProgressbar
                value={probability}
                text={`${probabilityText}%`}
                styles={buildStyles({
                  pathColor: probability >= 60 ? "var(--danger)" : probability >= 30 ? "var(--warning)" : "var(--success)",
                  textColor: "var(--text-primary)",
                  trailColor: "var(--border-glass)"
                })}
              />
            </div>
            <p className="recommendation">ML Says: <strong>{app.mlRecommendation}</strong></p>
          </div>

          <div className="result-details">
            <h3>Decision Breakdown</h3>
            <Detail label="Final Risk Score" value={`${app.riskScore} / 100`} />
            <Detail label="Rule-based Score" value={app.ruleRiskScore} />
            <Detail label="Decision Source" value={app.decisionSource} />
            <Detail label="Model Version" value={app.modelVersion} />
            <Detail label="Location Risk" value={app.locationRisk} />
            <Detail label="Device Known" value={app.deviceKnown} />
            <Detail label="Device Risk" value={app.deviceRisk} />
            <Detail label="Applicant IP" value={app.applicantIp} />
          </div>
        </div>

        <div className="summary-section full-width">
          <h3>SHAP Insights (Risk Factors)</h3>
          <p>{analysis.modelExplanation || "Model explanation unavailable"}</p>
        </div>

        <div className="summary-section full-width">
          <h3>ML Input Pipeline</h3>
          {pipelineEntries.map(([label, value]) => (
            <div className="detail-row" key={label}>
              <span>{label}</span>
              <strong className="pipeline-value">
                {typeof value === "number" ? `${(value * 100).toFixed(1)}%` : String(value || "UNKNOWN")}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong className="detail-value">{value ?? "UNKNOWN"}</strong>
    </div>
  );
}

export default AdminApplicationDetail;

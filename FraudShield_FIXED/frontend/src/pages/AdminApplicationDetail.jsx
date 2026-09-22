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
  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showRawPipeline, setShowRawPipeline] = useState(false);

  useEffect(() => {
    api.get(`/api/admin/applications/${id}/fraud-analysis`)
      .then((response) => setAnalysis(response.data))
      .catch(() => toast.error("Unable to load fraud analysis"))
      .finally(() => setLoading(false));
  }, [id]);

  const generateAiReview = async () => {
    setAiLoading(true);
    try {
      const response = await api.get(`/loan/ai-review/${id}`);
      setAiReview(response.data);
    } catch {
      toast.error("AI review unavailable — ensure Ollama + Mistral are running");
      setAiReview("AI service unavailable. Ensure Ollama is running with the Mistral model.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-page"><div className="skeleton-card glass-card"></div></div>;
  }

  if (!analysis) {
    return <div className="dashboard-page"><div className="empty-state glass-card">Analysis unavailable</div></div>;
  }

  const app     = analysis.application;
  const fa      = analysis.fraudAssessment    || {};
  const is_     = analysis.identitySignals    || {};
  const bs      = analysis.behavioralSignals  || {};
  const ca      = analysis.creditAssessment   || {};

  // ── Parse risk factors ─────────────────────────────────────────────────────
  let riskFactors = [];
  try {
    riskFactors = JSON.parse(analysis.fraudRiskFactors || "[]");
    if (!Array.isArray(riskFactors)) riskFactors = [];
  } catch { riskFactors = []; }

  // ── Gauge values ───────────────────────────────────────────────────────────
  const mlProbability = Number(app.mlFraudProbability || 0) * 100;
  const mlProbText = mlProbability < 1 ? mlProbability.toFixed(2) : mlProbability.toFixed(1);
  const finalScore = Number(fa.finalFraudRiskScore ?? app.riskScore ?? 0);
  const finalScoreText = finalScore.toFixed(1);

  const riskColor = (score) =>
    score >= 65 ? "var(--danger)" : score >= 30 ? "var(--warning)" : "var(--success)";

  const fraudDecision = fa.fraudDecision || app.fraudDecision || app.decision || "UNKNOWN";
  const decisionLabel = {
    LOW_RISK:      { label: "Low Fraud Risk",         color: "var(--success)", icon: "✅" },
    MANUAL_REVIEW: { label: "Manual Review Required",  color: "var(--warning)", icon: "⚠️" },
    HIGH_RISK:     { label: "High Fraud Risk — Hold",  color: "var(--danger)",  icon: "🚨" },
  }[fraudDecision] || { label: fraudDecision, color: "var(--text-secondary)", icon: "ℹ️" };

  // ── Factor badge color ─────────────────────────────────────────────────────
  const factorColor = (f) => {
    if (f.includes("FAILED") || f.includes("HIGH") || f.includes("THRESHOLD")) return "var(--danger)";
    if (f.includes("UNKNOWN") || f.includes("VELOCITY") || f.includes("REVIEW")) return "var(--warning)";
    return "var(--info)";
  };

  const pipelineEntries = Object.entries(analysis.pipeline || {});

  return (
    <div className="loan-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="results-container glass-card">
        <div className="results-header">
          <div>
            <h2>🛡️ Fraud Assessment</h2>
            <p className="subtitle">Application FS-2026-{String(app.id).padStart(5, "0")} — {app.fullName}</p>
          </div>
          <Link to="/dashboard" className="btn-outline">← Back to Dashboard</Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION 1: Fraud Assessment                                         */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <SectionHeader icon="🤖" title="Section 1 — Fraud Assessment (ML Model Output)" />
        <div className="results-grid">
          {/* ML Fraud Probability gauge */}
          <div className="result-card">
            <h4>ML Fraud Probability</h4>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
              HistGradientBoosting + CalibratedClassifierCV (sigmoid)
            </p>
            <div className="gauge-container">
              <CircularProgressbar
                value={mlProbability}
                text={`${mlProbText}%`}
                styles={buildStyles({
                  pathColor: riskColor(mlProbability),
                  textColor: "var(--text-primary)",
                  trailColor: "var(--border-glass)"
                })}
              />
            </div>
            <p className="recommendation">
              ML Says: <strong>{fa.mlRecommendation || app.mlRecommendation || "N/A"}</strong>
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
              Model: {fa.modelVersion || app.modelVersion || "N/A"}
            </p>
          </div>

          {/* Final Fraud Risk gauge */}
          <div className="result-card">
            <h4>Final Fraud Risk Score</h4>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
              ML (0.55) + Identity (0.15) + Device (0.10) + Velocity (0.10) + Location (0.10)
            </p>
            <div className="gauge-container">
              <CircularProgressbar
                value={finalScore}
                text={`${finalScoreText}`}
                styles={buildStyles({
                  pathColor: riskColor(finalScore),
                  textColor: "var(--text-primary)",
                  trailColor: "var(--border-glass)"
                })}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <span style={{
                display: "inline-block",
                padding: "6px 18px",
                borderRadius: "999px",
                background: `${decisionLabel.color}20`,
                color: decisionLabel.color,
                border: `1px solid ${decisionLabel.color}`,
                fontWeight: 700,
                fontSize: "14px"
              }}>
                {decisionLabel.icon} {decisionLabel.label}
              </span>
            </div>
          </div>

          <div className="result-details">
            <h3>Assessment Details</h3>
            <Detail label="Final Fraud Risk Score" value={`${finalScore} / 100`} />
            <Detail label="ML Fraud Probability"   value={fa.mlFraudProbabilityPct || (app.mlFraudProbability != null ? `${(app.mlFraudProbability*100).toFixed(2)}%` : "N/A")} />
            <Detail label="Anomaly Score (IsolationForest)" value={fa.anomalyScore != null ? fa.anomalyScore.toFixed(6) : (app.anomalyScore != null ? app.anomalyScore.toFixed(6) : "N/A")} />
            <Detail label="Fraud Decision"          value={fraudDecision?.replace(/_/g, " ")} />
            <Detail label="Application Status"      value={app.status?.replace(/_/g, " ")} />
            <Detail label="Decision Source"         value={fa.decisionSource || app.decisionSource} />
            <Detail label="Model Version"           value={fa.modelVersion || app.modelVersion || "N/A"} />
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="summary-section full-width" style={{ marginTop: "8px" }}>
          <h3>📊 Fraud Score Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginTop: "12px" }}>
            <ScoreBar label="ML Probability" value={mlProbability} weight={0.55} color="var(--info)" />
            <ScoreBar label="Identity Risk"  value={fa.identityRiskScore ?? app.identityRiskScore ?? 0} weight={0.15} color="var(--warning)" />
            <ScoreBar label="Device Risk"    value={fa.deviceRiskScore   ?? app.deviceRiskScore   ?? 0} weight={0.10} color="var(--warning)" />
            <ScoreBar label="Velocity Risk"  value={fa.velocityRiskScore ?? app.velocityRiskScore ?? 0} weight={0.10} color="var(--warning)" />
            <ScoreBar label="Location Risk"  value={fa.locationRiskScore ?? app.locationRiskScore ?? 0} weight={0.10} color="var(--warning)" />
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
            finalFraudRisk = (0.55 × ML%) + (0.15 × identity) + (0.10 × device) + (0.10 × velocity) + (0.10 × location) — Weights configurable in application.properties
          </p>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION 2: Identity & Behavioral Signals                             */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <SectionHeader icon="🪪" title="Section 2 — Identity & Behavioral Signals" />
        <div className="results-grid">
          <div className="result-details">
            <h3>Identity Signals</h3>
            <Detail label="Aadhaar Verified"      value={is_.aadhaarVerified    ? "✅ YES" : "❌ NO"} />
            <Detail label="Mobile OTP Verified"   value={is_.mobileOtpVerified  ? "✅ YES" : "❌ NO"} />
            <Detail label="Masked Aadhaar"        value={is_.maskedAadhaar || app.maskedAadhaar || "N/A"} />
            <Detail label="Identity Risk Score"   value={`${fa.identityRiskScore ?? app.identityRiskScore ?? 0} / 100`} />
          </div>
          <div className="result-details">
            <h3>Device & Location Signals</h3>
            <Detail label="Device Known"          value={bs.deviceKnown  || app.deviceKnown  || "N/A"} />
            <Detail label="Device Risk"           value={bs.deviceRisk   || app.deviceRisk   || "N/A"} />
            <Detail label="Device Risk Score"     value={`${fa.deviceRiskScore ?? app.deviceRiskScore ?? 0} / 100`} />
            <Detail label="Location Risk"         value={bs.locationRisk || app.locationRisk || "N/A"} />
            <Detail label="Location Risk Score"   value={`${fa.locationRiskScore ?? app.locationRiskScore ?? 0} / 100`} />
            <Detail label="Applicant IP"          value={bs.applicantIp  || app.applicantIp  || "N/A"} />
            <Detail label="City / State"          value={`${bs.city || app.city || "N/A"} / ${bs.state || app.state || "N/A"}`} />
          </div>
          <div className="result-details">
            <h3>Velocity Signals (via ML Engine)</h3>
            <Detail label="Velocity Risk Score"   value={`${fa.velocityRiskScore ?? app.velocityRiskScore ?? 0} / 100`} />
            <Detail label="Note" value="identityApplications24h and deviceIdentities24h are computed server-side by the ML engine from its prediction history" />
            <Detail label="Session / Login telemetry" value="sessionSeconds, failedLogins24h, ipChanged = -1 (missing — requires browser instrumentation)" />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION 3: Fraud Risk Factors                                        */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <SectionHeader icon="⚠️" title="Section 3 — Fraud Risk Factors" />
        <div className="summary-section full-width">
          {riskFactors.length === 0 ? (
            <p style={{ color: "var(--success)", fontWeight: 600 }}>✅ No significant fraud risk factors detected</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              {riskFactors.map((factor) => (
                <span key={factor} style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  borderRadius: "999px",
                  background: `${factorColor(factor)}20`,
                  color: factorColor(factor),
                  border: `1px solid ${factorColor(factor)}`,
                  fontWeight: 600,
                  fontSize: "12px",
                  fontFamily: "monospace"
                }}>
                  {factor}
                </span>
              ))}
            </div>
          )}
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px" }}>
            CLASSIFIER_REVIEW_THRESHOLD = ML probability exceeded model review threshold.<br/>
            UNUSUAL_BEHAVIOUR_REVIEW = IsolationForest detected an anomalous behavioral pattern.<br/>
            INSUFFICIENT_TELEMETRY = ≥4 behavioral features were missing (sent as -1).
          </p>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION 4: Credit Assessment (Separate — NOT fraud)                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <SectionHeader icon="💳" title="Section 4 — Credit Assessment (Separate from Fraud)" />
        <div className="summary-section full-width">
          <div style={{
            padding: "10px 16px",
            borderRadius: "8px",
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.3)",
            color: "var(--info)",
            fontSize: "13px",
            marginBottom: "16px",
            lineHeight: "1.6"
          }}>
            <strong>ℹ️ Important:</strong> Credit data below is evaluated <em>separately</em> by the lending team.
            Credit score, income, employment type and loan amount are <strong>NOT</strong> fraud indicators
            and are <strong>not included</strong> in the fraud risk score above.
            A low fraud risk score means <em>"No significant fraud indicators detected — continue normal lending process."</em>
            It does <strong>NOT</strong> mean <em>"Loan is approved."</em>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
            <Detail label="Credit Score"       value={ca.creditScore ?? app.creditScore ?? "N/A"} />
            <Detail label="Annual Income"      value={ca.annualIncome ? `₹${Number(ca.annualIncome).toLocaleString()}` : "N/A"} />
            <Detail label="Loan Amount"        value={ca.loanAmount ? `₹${Number(ca.loanAmount).toLocaleString()}` : "N/A"} />
            <Detail label="Loan-to-Income"     value={ca.loanToIncomeRatioPct || "N/A"} />
            <Detail label="Employment Type"    value={ca.employmentType ?? app.employmentType ?? "N/A"} />
            <Detail label="Existing Loans"     value={ca.existingLoans ?? app.existingLoans ?? "N/A"} />
            <Detail label="Loan Purpose"       value={ca.loanPurpose ?? app.loanPurpose ?? "N/A"} />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION 5: AI Analyst Summary (Mistral)                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <SectionHeader icon="🧠" title="Section 5 — AI Analyst Summary (Mistral)" />
        <div className="summary-section full-width">
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>
            Mistral summarises the fraud analysis in natural language. It does NOT calculate scores or make lending decisions.
          </p>
          {aiReview ? (
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-glass)",
              borderRadius: "8px",
              padding: "16px",
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              fontSize: "14px",
              lineHeight: "1.7"
            }}>
              {aiReview}
            </div>
          ) : (
            <button
              onClick={generateAiReview}
              className="btn-primary"
              disabled={aiLoading}
              style={{ marginTop: "4px" }}
            >
              {aiLoading ? "Generating AI Review..." : "🧠 Generate AI Analyst Review"}
            </button>
          )}
        </div>

        {/* ── Technical Debug (collapsed by default) ──────────────────────── */}
        <div style={{ marginTop: "24px" }}>
          <button
            onClick={() => setShowRawPipeline(!showRawPipeline)}
            className="btn-outline"
            style={{ fontSize: "12px", padding: "6px 14px" }}
          >
            {showRawPipeline ? "▲ Hide" : "▼ Show"} Raw ML Input Pipeline (technical)
          </button>
          {showRawPipeline && (
            <div className="summary-section full-width" style={{ marginTop: "12px" }}>
              <h3>ML Input Pipeline</h3>
              {pipelineEntries.map(([label, value]) => (
                <div className="detail-row" key={label}>
                  <span>{label}</span>
                  <strong className="pipeline-value">
                    {typeof value === "number"
                      ? value < 1 && value > 0 ? `${(value * 100).toFixed(1)}%` : value
                      : String(value || "UNKNOWN")}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }) {
  return (
    <div style={{
      margin: "28px 0 12px",
      padding: "10px 16px",
      background: "rgba(255,255,255,0.04)",
      borderLeft: "3px solid var(--info)",
      borderRadius: "0 8px 8px 0",
      fontWeight: 700,
      fontSize: "14px",
      color: "var(--text-primary)",
      letterSpacing: "0.02em"
    }}>
      {icon} {title}
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

function ScoreBar({ label, value, weight, color }) {
  const num = Number(value) || 0;
  const contribution = (weight * num).toFixed(1);
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 14px" }}>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color }}>{num.toFixed(0)}<span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/100</span></div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>weight {weight} → contributes <strong style={{ color }}>{contribution}</strong></div>
      <div style={{ background: "var(--border-glass)", borderRadius: "4px", height: "4px", marginTop: "6px" }}>
        <div style={{ width: `${Math.min(num, 100)}%`, background: color, height: "4px", borderRadius: "4px", transition: "width 0.5s" }}></div>
      </div>
    </div>
  );
}

export default AdminApplicationDetail;

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import toast from "react-hot-toast";
import api from "../services/api";
import "./AdminDetail.css";

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
    return (
      <div className="detail-page">
        <div className="detail-nav">
          <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
        </div>
        <div className="detail-body">
          <div className="skeleton-block" style={{ height: 200 }} />
          <div className="skeleton-block" style={{ height: 320 }} />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="detail-page">
        <div className="detail-nav">
          <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
        </div>
        <div className="detail-body">
          <div className="empty-box">Analysis data unavailable.</div>
        </div>
      </div>
    );
  }

  const app = analysis.application;
  const fa  = analysis.fraudAssessment   || {};
  const is_ = analysis.identitySignals   || {};
  const bs  = analysis.behavioralSignals || {};
  const ca  = analysis.creditAssessment  || {};

  let riskFactors = [];
  try {
    riskFactors = JSON.parse(analysis.fraudRiskFactors || "[]");
    if (!Array.isArray(riskFactors)) riskFactors = [];
  } catch { riskFactors = []; }

  const mlProbability  = Number(app.mlFraudProbability || 0) * 100;
  const mlProbText     = mlProbability < 1 ? mlProbability.toFixed(2) : mlProbability.toFixed(1);
  const finalScore     = Number(fa.finalFraudRiskScore ?? app.riskScore ?? 0);
  const finalScoreText = finalScore.toFixed(1);

  const riskColor = (score) =>
    score >= 65 ? "#ef4444" : score >= 30 ? "#f59e0b" : "#10b981";

  const fraudDecision = fa.fraudDecision || app.fraudDecision || app.decision || "UNKNOWN";
  const decisionMeta = {
    LOW_RISK:      { label: "Low Fraud Risk",        color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)"  },
    MANUAL_REVIEW: { label: "Manual Review Required", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)"  },
    HIGH_RISK:     { label: "High Fraud Risk — Hold", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)"   },
  }[fraudDecision] || { label: fraudDecision, color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" };

  const factorColor = (f) => {
    if (f.includes("FAILED") || f.includes("HIGH") || f.includes("THRESHOLD")) return "#ef4444";
    if (f.includes("UNKNOWN") || f.includes("VELOCITY") || f.includes("REVIEW"))  return "#f59e0b";
    return "#3b82f6";
  };

  const pipelineEntries = Object.entries(analysis.pipeline || {});

  return (
    <div className="detail-page">
      {/* Top Nav */}
      <nav className="detail-nav">
        <div className="detail-nav-left">
          <Link to="/dashboard" className="back-link">← Dashboard</Link>
          <span className="detail-breadcrumb">
            Application FS-2026-{String(app.id).padStart(5, "0")} — {app.fullName}
          </span>
        </div>
        <div
          className="decision-pill"
          style={{ background: decisionMeta.bg, color: decisionMeta.color, border: `1px solid ${decisionMeta.border}` }}
        >
          {decisionMeta.label}
        </div>
      </nav>

      <div className="detail-body">

        {/* ── Section 1: Fraud Assessment ──────────────────────────────────── */}
        <SectionHeader icon="🤖" title="Section 1 — Fraud Assessment" />

        {/* Gauges + Details row */}
        <div className="gauges-row">
          {/* Gauge 1 */}
          <div className="gauge-card glass-card">
            <div className="gauge-label">ML Fraud Probability</div>
            <div className="gauge-sub">HistGradientBoosting + CalibratedClassifierCV</div>
            <div className="gauge-wrap">
              <CircularProgressbar
                value={mlProbability}
                text={`${mlProbText}%`}
                styles={buildStyles({
                  pathColor:  riskColor(mlProbability),
                  textColor:  "#f1f5f9",
                  trailColor: "rgba(255,255,255,0.08)",
                  textSize:   "18px",
                })}
              />
            </div>
            <div className="gauge-footer">
              ML Says: <strong>{fa.mlRecommendation || app.mlRecommendation || "N/A"}</strong>
            </div>
            <div className="gauge-model">Model: {fa.modelVersion || app.modelVersion || "N/A"}</div>
          </div>

          {/* Gauge 2 */}
          <div className="gauge-card glass-card">
            <div className="gauge-label">Final Fraud Risk Score</div>
            <div className="gauge-sub">ML (55%) + Identity + Device + Velocity + Location</div>
            <div className="gauge-wrap">
              <CircularProgressbar
                value={finalScore}
                text={finalScoreText}
                styles={buildStyles({
                  pathColor:  riskColor(finalScore),
                  textColor:  "#f1f5f9",
                  trailColor: "rgba(255,255,255,0.08)",
                  textSize:   "18px",
                })}
              />
            </div>
            <div className="gauge-footer">Decision Source: <strong>{fa.decisionSource || app.decisionSource || "RULES"}</strong></div>
            <div className="gauge-model">Status: {app.status?.replace(/_/g, " ")}</div>
          </div>

          {/* Details panel */}
          <div className="detail-panel glass-card">
            <div className="panel-title">Assessment Details</div>
            <Row label="Final Risk Score"     value={`${finalScore} / 100`} />
            <Row label="ML Fraud Probability" value={fa.mlFraudProbabilityPct || (app.mlFraudProbability != null ? `${(app.mlFraudProbability * 100).toFixed(2)}%` : "N/A")} />
            <Row label="Anomaly Score"        value={fa.anomalyScore != null ? fa.anomalyScore.toFixed(6) : (app.anomalyScore != null ? app.anomalyScore.toFixed(6) : "N/A")} />
            <Row label="Fraud Decision"       value={fraudDecision?.replace(/_/g, " ")} />
            <Row label="Application Status"   value={app.status?.replace(/_/g, " ")} />
            <Row label="Decision Source"      value={fa.decisionSource || app.decisionSource} />
            <Row label="Model Version"        value={fa.modelVersion || app.modelVersion || "N/A"} />
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="section-card glass-card">
          <div className="panel-title">📊 Fraud Score Breakdown</div>
          <div className="score-bars-grid">
            <ScoreBar label="ML Probability" value={mlProbability}                                          weight={0.55} color="#3b82f6" />
            <ScoreBar label="Identity Risk"  value={fa.identityRiskScore ?? app.identityRiskScore ?? 0}    weight={0.15} color="#f59e0b" />
            <ScoreBar label="Device Risk"    value={fa.deviceRiskScore   ?? app.deviceRiskScore   ?? 0}    weight={0.10} color="#f59e0b" />
            <ScoreBar label="Velocity Risk"  value={fa.velocityRiskScore ?? app.velocityRiskScore ?? 0}    weight={0.10} color="#f59e0b" />
            <ScoreBar label="Location Risk"  value={fa.locationRiskScore ?? app.locationRiskScore ?? 0}    weight={0.10} color="#f59e0b" />
          </div>
          <p className="formula-note">
            finalRisk = (0.55 × ML%) + (0.15 × identity) + (0.10 × device) + (0.10 × velocity) + (0.10 × location)
          </p>
        </div>

        {/* ── Section 2: Identity & Behavioral ────────────────────────────── */}
        <SectionHeader icon="🪪" title="Section 2 — Identity & Behavioral Signals" />
        <div className="three-col-grid">
          <div className="detail-panel glass-card">
            <div className="panel-title">Identity Signals</div>
            <Row label="Aadhaar Verified"    value={is_.aadhaarVerified   ? "✅ YES" : "❌ NO"} />
            <Row label="Mobile OTP Verified" value={is_.mobileOtpVerified ? "✅ YES" : "❌ NO"} />
            <Row label="Masked Aadhaar"      value={is_.maskedAadhaar || app.maskedAadhaar || "N/A"} />
            <Row label="Identity Risk Score" value={`${fa.identityRiskScore ?? app.identityRiskScore ?? 0} / 100`} />
          </div>
          <div className="detail-panel glass-card">
            <div className="panel-title">Device & Location</div>
            <Row label="Device Known"       value={bs.deviceKnown  || app.deviceKnown  || "N/A"} />
            <Row label="Device Risk"        value={bs.deviceRisk   || app.deviceRisk   || "N/A"} />
            <Row label="Device Risk Score"  value={`${fa.deviceRiskScore ?? app.deviceRiskScore ?? 0} / 100`} />
            <Row label="Location Risk"      value={bs.locationRisk || app.locationRisk || "N/A"} />
            <Row label="Location Score"     value={`${fa.locationRiskScore ?? app.locationRiskScore ?? 0} / 100`} />
            <Row label="Applicant IP"       value={bs.applicantIp  || app.applicantIp  || "N/A"} />
            <Row label="City / State"       value={`${bs.city || app.city || "N/A"} / ${bs.state || app.state || "N/A"}`} />
          </div>
          <div className="detail-panel glass-card">
            <div className="panel-title">Velocity (ML Engine)</div>
            <Row label="Velocity Risk Score" value={`${fa.velocityRiskScore ?? app.velocityRiskScore ?? 0} / 100`} />
            <Row label="Source"              value="identityApplications24h & deviceIdentities24h computed server-side" />
            <Row label="Session telemetry"   value="sessionSeconds, failedLogins24h, ipChanged = -1 (missing — browser instrumentation required)" />
          </div>
        </div>

        {/* ── Section 3: Risk Factors ──────────────────────────────────────── */}
        <SectionHeader icon="⚠️" title="Section 3 — Fraud Risk Factors" />
        <div className="section-card glass-card">
          {riskFactors.length === 0 ? (
            <p style={{ color: "#10b981", fontWeight: 600 }}>✅ No significant fraud risk factors detected</p>
          ) : (
            <div className="factor-chips">
              {riskFactors.map((factor) => (
                <span
                  key={factor}
                  className="factor-chip"
                  style={{ color: factorColor(factor), background: `${factorColor(factor)}18`, borderColor: `${factorColor(factor)}55` }}
                >
                  {factor}
                </span>
              ))}
            </div>
          )}
          <p className="formula-note" style={{ marginTop: 12 }}>
            CLASSIFIER_REVIEW_THRESHOLD = ML probability exceeded model review threshold.<br />
            UNUSUAL_BEHAVIOUR_REVIEW = IsolationForest detected an anomalous behavioral pattern.<br />
            INSUFFICIENT_TELEMETRY = ≥4 behavioral features were missing.
          </p>
        </div>

        {/* ── Section 4: Credit Assessment ────────────────────────────────── */}
        <SectionHeader icon="💳" title="Section 4 — Credit Assessment (Separate from Fraud)" />
        <div className="section-card glass-card">
          <div className="info-banner">
            <strong>ℹ️ Important:</strong> Credit data is evaluated <em>separately</em> by the lending team.
            Credit score, income, employment type and loan amount are <strong>NOT</strong> fraud indicators and
            are <strong>not included</strong> in the fraud risk score above.
          </div>
          <div className="credit-grid">
            <Row label="Credit Score"    value={ca.creditScore ?? app.creditScore ?? "N/A"} />
            <Row label="Annual Income"   value={ca.annualIncome ? `₹${Number(ca.annualIncome).toLocaleString()}` : "N/A"} />
            <Row label="Loan Amount"     value={ca.loanAmount  ? `₹${Number(ca.loanAmount).toLocaleString()}`  : "N/A"} />
            <Row label="Loan-to-Income"  value={ca.loanToIncomeRatioPct || "N/A"} />
            <Row label="Employment Type" value={ca.employmentType ?? app.employmentType ?? "N/A"} />
            <Row label="Existing Loans"  value={ca.existingLoans ?? app.existingLoans ?? "N/A"} />
            <Row label="Loan Purpose"    value={ca.loanPurpose  ?? app.loanPurpose   ?? "N/A"} />
          </div>
        </div>

        {/* ── Section 5: AI Analyst ────────────────────────────────────────── */}
        <SectionHeader icon="🧠" title="Section 5 — AI Analyst Summary (Mistral)" />
        <div className="section-card glass-card">
          <p className="section-note">
            Mistral summarises the fraud analysis in natural language. It does NOT calculate scores or make lending decisions.
          </p>
          {aiReview ? (
            <div className="ai-review-box">{aiReview}</div>
          ) : (
            <button onClick={generateAiReview} className="btn-primary" disabled={aiLoading}>
              {aiLoading ? "Generating AI Review…" : "🧠 Generate AI Analyst Review"}
            </button>
          )}
        </div>

        {/* ── Raw Pipeline (collapsed) ─────────────────────────────────────── */}
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setShowRawPipeline(!showRawPipeline)}
            className="btn-toggle"
          >
            {showRawPipeline ? "▲ Hide" : "▼ Show"} Raw ML Input Pipeline (technical)
          </button>
          {showRawPipeline && (
            <div className="section-card glass-card" style={{ marginTop: 12 }}>
              <div className="panel-title">ML Input Pipeline</div>
              <div className="pipeline-grid">
                {pipelineEntries.map(([label, value]) => (
                  <Row
                    key={label}
                    label={label}
                    value={typeof value === "number"
                      ? (value < 1 && value > 0 ? `${(value * 100).toFixed(1)}%` : value)
                      : String(value ?? "UNKNOWN")}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function SectionHeader({ icon, title }) {
  return (
    <div className="section-header">
      {icon} {title}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="detail-row">
      <span className="row-label">{label}</span>
      <strong className="row-value">{value ?? "—"}</strong>
    </div>
  );
}

function ScoreBar({ label, value, weight, color }) {
  const num = Number(value) || 0;
  const contribution = (weight * num).toFixed(1);
  return (
    <div className="score-bar-item">
      <div className="score-bar-top">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value" style={{ color }}>{num.toFixed(0)}<span className="score-bar-max">/100</span></span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${Math.min(num, 100)}%`, background: color }} />
      </div>
      <div className="score-bar-contrib">weight {weight} → contributes <strong style={{ color }}>{contribution}</strong></div>
    </div>
  );
}

export default AdminApplicationDetail;

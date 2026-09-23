import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LandingPage.css";

function LandingPage() {
  const { isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <h2>Fraud<span>Shield AI</span></h2>
        </div>
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              {isAdmin && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
              <Link to="/verify" className="nav-link">Identity</Link>
              <Link to="/my-applications" className="nav-link">My Applications</Link>
              <Link to="/loan" className="nav-link">Apply for Loan</Link>
              <button onClick={logout} className="btn-secondary">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/login" className="btn-primary">Apply Now</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="animate-fade-in-up">
            Smarter Lending.<br/>
            <span className="text-gradient">Fraud-Free.</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-up delay-1">
            ML-powered fraud detection and identity verification for secure digital lending.
          </p>
          <div className="hero-actions animate-fade-in-up delay-2">
            <Link to={isAuthenticated ? "/verify" : "/login"} className="btn-primary btn-large">
              Apply for a Loan
            </Link>
            {isAuthenticated && isAdmin ? (
              <Link to="/dashboard" className="btn-outline btn-large">Open Dashboard</Link>
            ) : (
              <Link to="/login" className="btn-outline btn-large">Sign In</Link>
            )}
          </div>
        </div>
        <div className="hero-background">
          <div className="glow-orb orb-1"></div>
          <div className="glow-orb orb-2"></div>
        </div>
      </div>

      {/* Features */}
      <div className="features-section">
        <div className="feature-card glass-card">
          <div className="feature-icon">🤖</div>
          <h3>ML Fraud Detection</h3>
          <p>HistGradientBoosting model with IsolationForest anomaly detection evaluates each application using real behavioral signals.</p>
        </div>
        <div className="feature-card glass-card">
          <div className="feature-icon">🪪</div>
          <h3>Identity Verification</h3>
          <p>Aadhaar-based KYC with OCR extraction ensures only verified identities can submit loan applications.</p>
        </div>
        <div className="feature-card glass-card">
          <div className="feature-icon">🏦</div>
          <h3>Admin Risk Dashboard</h3>
          <p>Full-featured admin panel with fraud scoring breakdowns, risk distribution charts, and per-application analysis.</p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

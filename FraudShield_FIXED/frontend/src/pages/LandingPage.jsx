import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LandingPage.css";

function LandingPage() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="navbar glass-card">
        <div className="nav-logo">
          <h2>Fraud<span>Shield AI</span></h2>
        </div>
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/loan" className="nav-link">Apply for Loan</Link>
              <button onClick={logout} className="btn-secondary">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/loan" className="btn-primary">Apply Now</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="animate-fade-in-up">
            Next-Generation <br/>
            <span className="text-gradient">AI Fraud Detection</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-up delay-1">
            Detect Fraud • Analyze Risk • Approve Loans
          </p>
          <div className="hero-actions animate-fade-in-up delay-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary btn-large">Open Dashboard</Link>
            ) : (
              <Link to="/login" className="btn-primary btn-large">Admin Login</Link>
            )}
            <Link to="/loan" className="btn-outline btn-large">Apply For Loan</Link>
          </div>
        </div>
        <div className="hero-background">
          <div className="glow-orb orb-1"></div>
          <div className="glow-orb orb-2"></div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section scroll-animate">
        <div className="stat-card glass-card">
          <h2>10M+</h2>
          <p>Transactions Processed</p>
        </div>
        <div className="stat-card glass-card">
          <h2>99.9%</h2>
          <p>Fraud Detection Accuracy</p>
        </div>
        <div className="stat-card glass-card">
          <h2>&lt; 50ms</h2>
          <p>Real-time AI Risk Analysis</p>
        </div>
      </div>

      {/* Features */}
      <div className="features-section scroll-animate">
        <div className="feature-card glass-card">
          <div className="feature-icon">🤖</div>
          <h3>AI Investigation</h3>
          <p>Generate SHAP-powered explanations for suspicious transactions and credit decisions.</p>
        </div>
        <div className="feature-card glass-card">
          <div className="feature-icon">⚡</div>
          <h3>Real-Time Monitoring</h3>
          <p>Analyze thousands of applications instantly and identify emerging risk patterns.</p>
        </div>
        <div className="feature-card glass-card">
          <div className="feature-icon">🏦</div>
          <h3>Smart Loan Approval</h3>
          <p>Evaluate applications comprehensively using our Hybrid Rule+ML engine.</p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
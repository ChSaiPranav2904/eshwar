import "../Login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", { username, password });
      login(response.data.token);
      toast.success("Successfully logged in!");
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid Credentials. Please try again.");
      toast.error("Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="left-panel">
        <h4>WELCOME TO</h4>
        <h1>
          Fraud<span>Shield AI</span>
        </h1>
        <h2>Smarter Lending. Safer Tomorrow.</h2>
        <p>
          AI-powered fraud detection and credit evaluation platform built for secure digital lending ecosystems.
        </p>

        <div className="status-box">🟢 AI Risk Engine Active</div>
        <div className="status-box">🔒 Identity Verification Enabled</div>
        <div className="status-box">⚡ Real-Time Fraud Scoring</div>

        <div className="quote-card">
          “Fraud is a tax on all of us. Building systems to prevent it is an investment in a fairer economy.”
          <br />
          <strong>— Warren Buffett</strong>
        </div>
      </div>

      <div className="right-panel">
        <div className="login-card">
          <h1>🛡 Admin Login</h1>
          <p>Access FraudShield AI Dashboard</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && <div className="error-text">{error}</div>}

            <button type="submit" disabled={isLoading}>
              {isLoading ? <div className="spinner" style={{ width: '24px', height: '24px', margin: '0' }}></div> : "Login"}
            </button>
          </form>

          <div className="footer-text">PEOPLE | DATA | TRUST</div>
        </div>
      </div>
    </div>
  );
}

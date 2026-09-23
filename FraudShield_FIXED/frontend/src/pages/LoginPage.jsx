import "../Login.css";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const requestedPath = location.state?.from?.pathname;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "register" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!username.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = mode === "register"
        ? await api.post("/api/auth/register", { name, email: username, password })
        : await api.post("/api/auth/login", { username, password });
      login(response.data.token);
      toast.success(mode === "register" ? "Account created!" : "Successfully logged in!");
      try {
        const payload = JSON.parse(atob(response.data.token.split('.')[1]));
        if (payload.role === 'ROLE_ADMIN') {
          navigate("/dashboard");
        } else {
          navigate(requestedPath || "/verify", { replace: true });
        }
      } catch {
        navigate(requestedPath || "/verify", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data || "Unable to complete request.");
      toast.error(mode === "register" ? "Sign up failed." : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="left-panel">
        <h4>Welcome to</h4>
        <h1>
          Fraud<span>Shield AI</span>
        </h1>
        <h2>Smarter Lending. Safer Tomorrow.</h2>
        <p>
          AI-powered fraud detection and credit evaluation platform built for secure digital lending ecosystems.
        </p>

        <div className="status-list">
          <div className="status-box">🟢 ML Risk Engine Active</div>
          <div className="status-box">🔒 Identity Verification Enabled</div>
          <div className="status-box">📊 Fraud Scoring Pipeline Ready</div>
        </div>

        <div className="quote-card">
          "Fraud is a tax on all of us. Building systems to prevent it is an investment in a fairer economy."
          <br />
          <strong>— Warren Buffett</strong>
        </div>
      </div>

      <div className="right-panel">
        <div className="login-card">
          <h1>{mode === "register" ? "Create Account" : "Sign In"}</h1>
          <p>
            {mode === "register"
              ? "Start identity verification and loan application"
              : requestedPath === "/loan"
                ? "Sign in to continue your loan application"
                : "Access your FraudShield AI account"}
          </p>

          <form onSubmit={handleLogin}>
            {mode === "register" && (
              <div className="input-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="input-group">
              <label htmlFor="username">Email</label>
              <input
                id="username"
                type="email"
                placeholder="Enter your email"
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
              {isLoading
                ? <div className="spinner" style={{ width: '20px', height: '20px', margin: 0 }} />
                : mode === "register" ? "Create Account" : "Sign In"}
            </button>
          </form>

          <hr className="form-divider" />

          <button
            type="button"
            className="btn-outline"
            style={{ width: "100%" }}
            onClick={() => {
              setError("");
              setMode(mode === "register" ? "login" : "register");
            }}
          >
            {mode === "register" ? "Already have an account? Sign In" : "New here? Create Account"}
          </button>

          <div className="footer-text">PEOPLE · DATA · TRUST</div>
        </div>
      </div>
    </div>
  );
}

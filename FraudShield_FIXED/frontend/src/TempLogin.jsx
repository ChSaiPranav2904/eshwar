// src/pages/Login.jsx
import "./Login.css";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {

    try {

      const response = await axios.post(
        "http://localhost:8087/auth/login",
        {
          username,
          password
        }
      );

      localStorage.setItem(
        "token",
        response.data.token
      );

      navigate("/dashboard");

    } catch (err) {

      alert("Invalid Credentials");

    }
  };

 return (
  <div className="login-page">

    <div className="left-panel">

      <h4>WELCOME TO</h4>

      <h1>
        Fraud<span>Shield AI</span>
      </h1>

      <h2>
        Smarter Lending. Safer Tomorrow.
      </h2>

      <p>
        AI-powered fraud detection and credit evaluation
        platform built for secure digital lending ecosystems.
      </p>

      <div className="status-box">
        🟢 AI Risk Engine Active
      </div>

      <div className="status-box">
        🔒 Identity Verification Enabled
      </div>

      <div className="status-box">
        ⚡ Real-Time Fraud Scoring
      </div>

      <div className="quote-card">
        “Fraud is a tax on all of us. Building systems to prevent it is an investment in a fairer economy.”
        <br />
        <strong>— Warren Buffett</strong>
      </div>

      <div className="quote-card">
        “Trust is the foundation of finance. Technology that prevents fraud protects people and powers progress.”
        <br />
        <strong>— Jamie Dimon</strong>
      </div>

      <div className="quote-card">
        “Technology is most powerful when it helps people make safer decisions.”
        <br />
        <strong>— Satya Nadella</strong>
      </div>

    </div>

    <div className="right-panel">

      <div className="login-card">

        <h1>🛡 Admin Login</h1>

        <p>
          Access FraudShield AI Dashboard
        </p>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button onClick={handleLogin}>
          Login
        </button>

        <div className="footer-text">
          PEOPLE | DATA | TRUST
        </div>

      </div>

    </div>

  </div>);}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import "./LoanForm.css";

function IdentityVerification() {
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [scan, setScan] = useState(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const response = await api.get("/api/verification/status");
    setStatus(response.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus().catch(() => toast.error("Unable to load verification status"));
  }, []);

  const uploadAadhaar = async () => {
    if (!file) {
      toast.error("Choose an Aadhaar image, PDF, or text demo document.");
      return;
    }
    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await api.post("/api/verification/aadhaar", body);
      setScan(response.data);
      toast.success("Aadhaar details extracted. Please confirm.");
    } catch (error) {
      toast.error(error.response?.data?.error || "Aadhaar scan failed");
    } finally {
      setLoading(false);
    }
  };

  const confirmAadhaar = async () => {
    setLoading(true);
    try {
      const response = await api.post("/api/verification/aadhaar/confirm", scan);
      setStatus(response.data);
      toast.success("Aadhaar details confirmed");
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to confirm Aadhaar details");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      const response = await api.post("/api/verification/mobile/send-otp", { mobileNumber });
      setDemoOtp(response.data.demoOtp);
      toast.success(`Demo OTP sent to ${response.data.mobileNumberMasked}`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const response = await api.post("/api/verification/mobile/verify-otp", { otp });
      setStatus(response.data);
      toast.success("Mobile verified");
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const current = status || {};
  const canContinue = current.identityVerified;

  return (
    <div className="loan-page">
      <div className="loan-header">
        <h1>Identity Verification</h1>
        <p className="subtitle">Complete Aadhaar confirmation and mobile OTP before applying.</p>
      </div>

      <div className="loan-container">
        <div className="loan-card glass-card">
          <div className="form-step">
            <h2>Aadhaar Verification</h2>
            <div className="form-grid">
              <div className="input-group full-width">
                <label htmlFor="aadhaarFile">Upload Aadhaar image, PDF, or text demo file</label>
                <input id="aadhaarFile" type="file" accept="image/*,.pdf,.txt" onChange={(e) => setFile(e.target.files?.[0])} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={uploadAadhaar} disabled={loading}>Scan Aadhaar</button>
              {current.aadhaarVerified && <span className="source-badge">Aadhaar Confirmed</span>}
            </div>

            {scan && !current.aadhaarVerified && (
              <div className="summary-section full-width">
                <h3>Confirm Extracted Details</h3>
                <Editable label="Name" value={scan.verifiedName} onChange={(value) => setScan({ ...scan, verifiedName: value })} />
                <Editable label="DOB" value={scan.verifiedDob} onChange={(value) => setScan({ ...scan, verifiedDob: value })} />
                <Editable label="Gender" value={scan.verifiedGender} onChange={(value) => setScan({ ...scan, verifiedGender: value })} />
                <Editable label="Address" value={scan.verifiedAddress} onChange={(value) => setScan({ ...scan, verifiedAddress: value })} />
                <p><strong>Aadhaar:</strong> {scan.maskedAadhaar || "XXXX XXXX"}</p>
                <p><strong>Verification Method:</strong> {scan.verificationMethod}</p>
                <div className="results-actions">
                  <button className="btn-submit" onClick={confirmAadhaar} disabled={loading}>Confirm Details</button>
                  <button className="btn-secondary" onClick={() => setScan(null)}>Re-upload Aadhaar</button>
                </div>
              </div>
            )}

            <h2 style={{ marginTop: "32px" }}>Mobile OTP</h2>
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="mobileNumber">Mobile Number</label>
                <input id="mobileNumber" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="input-group">
                <label htmlFor="otp">OTP</label>
                <input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6 digit OTP" />
              </div>
            </div>
            {demoOtp && <div className="demo-box">Development OTP: <strong>{demoOtp}</strong></div>}
            <div className="results-actions">
              <button className="btn-primary" onClick={sendOtp} disabled={loading || !current.aadhaarVerified}>Send OTP</button>
              <button className="btn-submit" onClick={verifyOtp} disabled={loading || !otp}>Verify OTP</button>
            </div>
          </div>
        </div>

        <div className="preview-card glass-card">
          <h2>Verification Status</h2>
          <div className="detail-row"><span>Aadhaar</span><strong>{current.aadhaarVerified ? "Verified" : "Pending"}</strong></div>
          <div className="detail-row"><span>Mobile</span><strong>{current.mobileVerified ? "Verified" : "Pending"}</strong></div>
          <div className="detail-row"><span>Identity</span><strong>{current.identityVerified ? "Verified" : "Pending"}</strong></div>
          <div className="detail-row"><span>Aadhaar</span><strong>{current.aadhaarLast4 ? `XXXX XXXX ${current.aadhaarLast4}` : "Not available"}</strong></div>
          <Link className={`btn-primary btn-large ${!canContinue ? "disabled-link" : ""}`} to={canContinue ? "/loan" : "#"}>
            Continue to Loan Application
          </Link>
          <Link className="btn-outline btn-large" to="/my-applications">My Applications</Link>
        </div>
      </div>
    </div>
  );
}

function Editable({ label, value, onChange }) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default IdentityVerification;

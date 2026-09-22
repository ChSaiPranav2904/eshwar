import { useState } from "react";

function LoanApplication() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    panNumber: "",

    age: "",
    annualIncome: "",
    loanAmount: "",

    creditScore: "",
    existingLoans: "",

    employmentType: "",
    loanPurpose: "",

    deviceKnown: "YES",
    locationRisk: "LOW"
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const submitApplication = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:8087/loan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...formData,
            age: Number(formData.age),
            annualIncome: Number(formData.annualIncome),
            loanAmount: Number(formData.loanAmount),
            creditScore: Number(formData.creditScore),
            existingLoans: Number(formData.existingLoans)
          })
        }
      );

      if (response.ok) {
        setMessage("✅ Loan Application Submitted Successfully");

        setFormData({
          fullName: "",
          email: "",
          phone: "",
          panNumber: "",
          age: "",
          annualIncome: "",
          loanAmount: "",
          creditScore: "",
          existingLoans: "",
          employmentType: "",
          loanPurpose: "",
          deviceKnown: "YES",
          locationRisk: "LOW"
        });
      } else {
        setMessage("❌ Submission Failed");
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Server Error");
    }
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "50px auto",
        padding: "30px",
        background: "#111827",
        borderRadius: "20px",
        color: "white"
      }}
    >
      <h1 style={{ textAlign: "center" }}>
        🏦 Smart Loan Application
      </h1>

      <form onSubmit={submitApplication}>
        <input
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          name="panNumber"
          placeholder="PAN Number"
          value={formData.panNumber}
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          type="number"
          name="age"
          placeholder="Age"
          value={formData.age}
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          type="number"
          name="annualIncome"
          placeholder="Annual Income"
          value={formData.annualIncome}
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          type="number"
          name="loanAmount"
          placeholder="Loan Amount"
          value={formData.loanAmount}
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          type="number"
          name="creditScore"
          placeholder="Credit Score"
          value={formData.creditScore}
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          type="number"
          name="existingLoans"
          placeholder="Existing Loans Count"
          value={formData.existingLoans}
          onChange={handleChange}
          required
        />

        <br /><br />

        <select
          name="employmentType"
          value={formData.employmentType}
          onChange={handleChange}
          required
        >
          <option value="">
            Select Employment Type
          </option>
          <option value="SALARIED">
            Salaried
          </option>
          <option value="SELF_EMPLOYED">
            Self Employed
          </option>
          <option value="BUSINESS">
            Business
          </option>
          <option value="STUDENT">
            Student
          </option>
        </select>

        <br /><br />

        <select
          name="deviceKnown"
          value={formData.deviceKnown}
          onChange={handleChange}
        >
          <option value="YES">
            Known Device
          </option>
          <option value="NO">
            Unknown Device
          </option>
        </select>

        <br /><br />

        <select
          name="locationRisk"
          value={formData.locationRisk}
          onChange={handleChange}
        >
          <option value="LOW">
            Low Risk Location
          </option>
          <option value="MEDIUM">
            Medium Risk Location
          </option>
          <option value="HIGH">
            High Risk Location
          </option>
        </select>

        <br /><br />

        <textarea
          name="loanPurpose"
          placeholder="Loan Purpose"
          value={formData.loanPurpose}
          onChange={handleChange}
          rows="4"
          required
        />

        <br /><br />

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "15px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          Submit Application
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontWeight: "bold"
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default LoanApplication;
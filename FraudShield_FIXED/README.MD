# 🛡️ FraudShield AI – Real-Time Fraud Detection & Smart Loan Eligibility System

## 📌 Overview

FraudShield AI is an AI-powered digital lending platform designed to improve loan approval accuracy while reducing fraudulent applications in real time.

The system combines:

- Rule-Based Risk Assessment
- AI-Powered Fraud Analysis
- Credit Evaluation
- Identity Verification
- Loan Eligibility Prediction
- Administrative Monitoring Dashboard

The platform enables financial institutions, NBFCs, fintech companies, and digital lenders to automate loan screening and identify potentially fraudulent applicants before loan disbursement.

---

# 🎯 Problem Statement

Digital lending platforms face multiple challenges:

- Identity Fraud
- Synthetic Identities
- Loan Stacking
- Fake Documentation
- Credit Risk Misclassification
- Manual Verification Delays

Traditional loan approval systems often rely solely on credit scores, making them vulnerable to sophisticated fraud techniques.

FraudShield AI introduces a multi-layered fraud detection architecture that evaluates applicant risk using financial, behavioral, and identity-based signals.

---

# ✨ Key Features

## 👤 Applicant Portal

Applicants can submit:

- Full Name
- Email Address
- Age
- Annual Income
- Loan Amount
- Credit Score
- Existing Loans
- Employment Type
- Loan Purpose
- National ID Type
- National ID Number
- Identity Document Upload

---

## 🧠 Smart Risk Engine

The platform calculates a dynamic risk score based on:

| Factor | Impact |
|----------|----------|
| Credit Score | High |
| Income-to-Loan Ratio | High |
| Existing Loans | Medium |
| Employment Type | Medium |
| Age | Medium |
| Device Trust | Medium |
| Location Risk | Medium |
| Identity Verification | High |

Risk scores are normalized to:

```text
0 - 100
```

---

## ⚖️ Loan Decision Engine

### 🟢 Low Risk

```text
Risk Score < 40
```

Decision:

```text
APPROVED
```

---

### 🟡 Medium Risk

```text
40 ≤ Risk Score < 70
```

Decision:

```text
MANUAL REVIEW
```

---

### 🔴 High Risk

```text
Risk Score ≥ 70
```

Decision:

```text
REJECTED
```

---

# 🤖 AI Fraud Analysis

The system integrates Large Language Models (LLMs) through:

- Spring AI
- OpenAI GPT

AI performs:

- Fraud Pattern Interpretation
- Risk Explanation
- Recommendation Generation
- Human-Readable Risk Reports

### Example AI Output

```text
Overall Risk Assessment:
Medium Risk

Positive Factors:
- Stable income
- Good credit score

Risk Factors:
- Multiple active loans
- High loan-to-income ratio

Fraud Indicators:
- Unknown device
- Identity verification concerns

Recommendation:
Manual Review
```

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      Frontend        │
                    │       ReactJS        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Spring Boot     │
                    │      REST APIs       │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼                             ▼

      ┌─────────────────┐          ┌─────────────────┐
      │ PostgreSQL DB   │          │ OpenAI / LLM    │
      │ Loan Records    │          │ Fraud Analysis  │
      └─────────────────┘          └─────────────────┘

                               │
                               ▼

                    ┌──────────────────────┐
                    │ Admin Dashboard      │
                    │ Fraud Monitoring     │
                    └──────────────────────┘
```

---

# 💻 Technology Stack

## Frontend

- ReactJS
- Axios
- React Router
- CSS3
- React Circular Progress Bar

## Backend

- Java 17
- Spring Boot
- Spring Security
- Spring Data JPA
- Spring AI
- Maven

## Database

- PostgreSQL

## AI Layer

- OpenAI GPT
- Spring AI ChatClient

## Cloud & Deployment

- AWS
- Railway
- Render
- Docker

---

# 🗄️ Database Schema

## LoanApplication

```java
id
fullName
email
age
annualIncome
loanAmount
creditScore
existingLoans
employmentType
loanPurpose
nationalIdType
nationalIdNumber
riskScore
decision
status
deviceKnown
locationRisk
```

---

# 🔐 Authentication Module

Authentication is implemented using:

```text
JWT Authentication
```

Features:

- Secure Login
- Protected Routes
- Token Validation
- Session Management

---

# 🚨 Fraud Indicators Used

## Financial Indicators

- Low Credit Score
- High Debt Burden
- Multiple Existing Loans
- High Loan Demand

## Identity Indicators

- Missing National ID
- Invalid ID Format
- Incomplete Verification
- Suspicious Identity Information

## Behavioral Indicators

- Unknown Device
- Suspicious Location
- Repeated Applications
- Abnormal User Patterns

---

# 📊 Risk Scoring Logic

The risk score is calculated using:

### Credit Score

- < 550 → High Risk
- 550–650 → Medium Risk
- 650–750 → Low Risk
- > 750 → Very Low Risk

### Income vs Loan Ratio

Higher requested loan amounts compared to income increase risk.

### Existing Loans

More active loans increase overall risk.

### Employment Status

Students and unstable employment profiles may receive higher risk scores.

### Device & Location

Unknown devices and high-risk locations contribute additional fraud risk.

### Identity Verification

National ID validation and document verification improve trustworthiness.

---

# 🚀 Future Enhancements

## OCR-Based ID Verification

Automatically extract:

- Name
- ID Number
- Date of Birth
- Address

from uploaded documents.

---

## Face Verification

Compare:

```text
Selfie Image
vs
Government ID
```

using facial similarity models.

---

## Vector Similarity Fraud Detection

Using:

```text
pgvector
```

to identify applicants similar to previously detected fraudsters.

---

## Real-Time Transaction Monitoring

Detect:

- Money Laundering
- Account Takeovers
- Loan Stacking
- Synthetic Identities

---

## Explainable AI Dashboard

Provide:

- Risk Breakdown
- Fraud Heatmaps
- Decision Transparency
- Audit Logs

---

# ⚙️ Installation

## Backend Setup

```bash
git clone <repository-url>

cd backend

mvn clean install

mvn spring-boot:run
```

Backend URL:

```text
http://localhost:8080
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend URL:

```text
http://localhost:5174
```

---

# 🎯 Project Vision

FraudShield AI aims to create a secure and intelligent lending ecosystem by combining:

- Artificial Intelligence
- Risk Analytics
- Identity Verification
- Explainable Decision Making

to reduce fraud, improve loan approval efficiency, and build trust in digital finance.

---

# 🏆 Potential Use Cases

- Banks
- NBFCs
- Digital Lending Platforms
- Fintech Companies
- Buy Now Pay Later (BNPL) Providers
- Microfinance Institutions

---

# 📜 License

MIT License

---

# 🚀 Tagline

> **"Detect Risk. Prevent Fraud. Approve with Confidence."**

### FraudShield AI
**AI-Powered Fraud Detection & Smart Loan Eligibility Platform**
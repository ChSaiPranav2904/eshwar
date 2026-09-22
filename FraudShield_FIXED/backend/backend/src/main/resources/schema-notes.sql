-- FraudShield schema additions used by Hibernate ddl-auto=update.
-- Keep for reviewers who want to apply/inspect the PostgreSQL shape manually.

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS identity_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    verification_method VARCHAR(64),
    verified_name VARCHAR(255),
    verified_dob VARCHAR(64),
    verified_gender VARCHAR(64),
    verified_address TEXT,
    aadhaar_last4 VARCHAR(4),
    aadhaar_verified BOOLEAN NOT NULL DEFAULT FALSE,
    mobile_number_masked VARCHAR(32),
    mobile_verified BOOLEAN NOT NULL DEFAULT FALSE,
    identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    mobile_number VARCHAR(32) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS known_devices (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    device_key VARCHAR(128) NOT NULL,
    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    UNIQUE(user_id, device_key)
);

ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS masked_aadhaar VARCHAR(32);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS device_risk VARCHAR(32);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ml_feature_vector TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS model_explanation TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS actual_outcome VARCHAR(32) DEFAULT 'UNKNOWN';
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./erasmus.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()

def ensure_schema() -> None:
    with engine.begin() as conn:
        call_columns = {
            row._mapping["name"]
            for row in conn.execute(text("PRAGMA table_info('calls')"))
        }
        if "erasmus_email" not in call_columns:
            conn.execute(text("ALTER TABLE calls ADD COLUMN erasmus_email VARCHAR"))
        if "min_gpa" not in call_columns:
            conn.execute(
                text("ALTER TABLE calls ADD COLUMN min_gpa REAL NOT NULL DEFAULT 0")
            )
        if "required_docs" not in call_columns:
            conn.execute(text("ALTER TABLE calls ADD COLUMN required_docs VARCHAR"))

        application_columns = {
            row._mapping["name"]
            for row in conn.execute(text("PRAGMA table_info('applications')"))
        }
        if "status" not in application_columns:
            conn.execute(
                text(
                    "ALTER TABLE applications ADD COLUMN status VARCHAR NOT NULL DEFAULT 'pending'"
                )
            )
        if "reviewed_at" not in application_columns:
            conn.execute(text("ALTER TABLE applications ADD COLUMN reviewed_at DATETIME"))
        if "reviewed_by_email" not in application_columns:
            conn.execute(
                text("ALTER TABLE applications ADD COLUMN reviewed_by_email VARCHAR")
            )
        if "decision_reason" not in application_columns:
            conn.execute(
                text("ALTER TABLE applications ADD COLUMN decision_reason VARCHAR")
            )
        if "gpa" not in application_columns:
            conn.execute(
                text(
                    "ALTER TABLE applications ADD COLUMN gpa REAL NOT NULL DEFAULT 0"
                )
            )

        user_columns = {
            row._mapping["name"]
            for row in conn.execute(text("PRAGMA table_info('users')"))
        }
        if "last_login_at" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at DATETIME"))
        if "is_verified" not in user_columns:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 1")
            )
        if "totp_secret" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR"))
        if "two_factor_enabled" not in user_columns:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT 0"
                )
            )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS inbox_messages (
                    id INTEGER PRIMARY KEY,
                    recipient_user_id INTEGER NOT NULL,
                    subject VARCHAR NOT NULL,
                    body VARCHAR NOT NULL,
                    created_at DATETIME,
                    read_at DATETIME,
                    FOREIGN KEY(recipient_user_id) REFERENCES users(id)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS two_factor_challenges (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    token_hash VARCHAR NOT NULL UNIQUE,
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS call_deadline_alerts (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    call_id INTEGER NOT NULL,
                    days_before INTEGER NOT NULL,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(call_id) REFERENCES calls(id),
                    UNIQUE(user_id, call_id, days_before)
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS application_status_history (
                    id INTEGER PRIMARY KEY,
                    application_id INTEGER NOT NULL,
                    status VARCHAR NOT NULL,
                    reason VARCHAR,
                    changed_by_email VARCHAR NOT NULL,
                    changed_by_role VARCHAR NOT NULL,
                    created_at DATETIME,
                    FOREIGN KEY(application_id) REFERENCES applications(id)
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INTEGER PRIMARY KEY,
                    email VARCHAR NOT NULL,
                    attempted_at DATETIME
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS login_locks (
                    id INTEGER PRIMARY KEY,
                    email VARCHAR NOT NULL UNIQUE,
                    locked_until DATETIME
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS login_audit_logs (
                    id INTEGER PRIMARY KEY,
                    email VARCHAR NOT NULL,
                    success BOOLEAN NOT NULL,
                    ip_address VARCHAR,
                    user_agent VARCHAR,
                    reason VARCHAR,
                    attempted_at DATETIME
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS email_verification_tokens (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    token_hash VARCHAR NOT NULL UNIQUE,
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    token_hash VARCHAR NOT NULL UNIQUE,
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY,
                    action VARCHAR NOT NULL,
                    application_id INTEGER,
                    call_title VARCHAR NOT NULL,
                    student_email VARCHAR NOT NULL,
                    reviewer_user_id INTEGER NOT NULL,
                    reviewer_email VARCHAR NOT NULL,
                    status VARCHAR NOT NULL,
                    reason VARCHAR,
                    created_at DATETIME,
                    FOREIGN KEY(application_id) REFERENCES applications(id),
                    FOREIGN KEY(reviewer_user_id) REFERENCES users(id)
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS application_documents (
                    id INTEGER PRIMARY KEY,
                    application_id INTEGER NOT NULL,
                    doc_type VARCHAR NOT NULL,
                    original_name VARCHAR NOT NULL,
                    stored_name VARCHAR NOT NULL,
                    size INTEGER NOT NULL,
                    created_at DATETIME,
                    FOREIGN KEY(application_id) REFERENCES applications(id)
                )
                """
            )
        )
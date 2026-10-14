from datetime import datetime
from pathlib import Path

def write_email(to_email: str, subject: str, body: str) -> None:
    out_dir = Path(__file__).resolve().parent / "emails"
    out_dir.mkdir(exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    safe_email = to_email.replace("@", "_at_").replace(".", "_")
    filename = out_dir / f"{timestamp}_{safe_email}.txt"

    content = f"To: {to_email}\nSubject: {subject}\n\n{body}\n"
    filename.write_text(content, encoding="utf-8")

"use client";

import { useState } from "react";
import Link from "next/link";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/useAuth";

const UNIVERSITY_EMAIL_MESSAGE =
  "Use a university email address ending in @ibu.edu.ba or @stu.ibu.edu.ba.";

export default function RegisterPage() {
  const { token, user, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith("@ibu.edu.ba") && !normalizedEmail.endsWith("@stu.ibu.edu.ba")) {
      setStatus(UNIVERSITY_EMAIL_MESSAGE);
      return;
    }
    try {
      const response = await apiRequest<{ message: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      setStatus(response.message);
      setSubmitted(true);
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container login-shell">
        <section className="hero-panel hero login-hero">
          <span className="eyebrow">Student Information System</span>
          <h1 className="headline">Create your account</h1>
          <p className="subhead">Use your university email. We will send a verification link before login.</p>
        </section>
        <section className="panel login-card">
          {status && <div className={`alert ${submitted ? "success" : "error"} section`} role="status">{status}</div>}
          {!submitted && (
            <form className="detail-list" onSubmit={submit}>
              <input
                placeholder="Email (name@ibu.edu.ba or name@stu.ibu.edu.ba)"
                value={email}
                onChange={event => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
              />
              <input
                placeholder="Password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button className="button primary" type="submit">Register</button>
            </form>
          )}
          <Link className="button ghost" href="/login">Back to login</Link>
        </section>
      </main>
    </>
  );
}

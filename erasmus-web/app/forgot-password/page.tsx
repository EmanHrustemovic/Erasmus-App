"use client";

import { useState } from "react";
import Link from "next/link";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/useAuth";

export default function ForgotPasswordPage() {
  const { token, user, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    try {
      const response = await apiRequest<{ message: string }>("/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setStatus(`${response.message} Check the email inbox or local backend emails folder.`);
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Request failed");
    }
  };

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container login-shell">
        <section className="hero-panel hero login-hero">
          <span className="eyebrow">Account recovery</span>
          <h1 className="headline">Reset your password</h1>
          <p className="subhead">Enter your university email and follow the secure reset link.</p>
        </section>
        <section className="panel login-card">
          {status && <div className="alert success section" role="status">{status}</div>}
          <form className="detail-list" onSubmit={submit}>
            <input
              type="email"
              placeholder="University email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <button className="button primary" type="submit">Send reset email</button>
          </form>
          <Link className="button ghost" href="/login">Back to login</Link>
        </section>
      </main>
    </>
  );
}

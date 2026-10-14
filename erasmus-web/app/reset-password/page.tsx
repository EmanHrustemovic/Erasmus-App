"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/useAuth";

function ResetPasswordContent() {
  const params = useSearchParams();
  const { token: authToken, user, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const token = params.get("token") ?? "";

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    if (!token) {
      setStatus("The reset link is missing or invalid.");
      return;
    }
    try {
      const response = await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setStatus(response.message);
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Password reset failed");
    }
  };

  return (
    <>
      <TopNav user={user} token={authToken} onLogout={logout} />
      <main className="container login-shell">
        <section className="hero-panel hero login-hero">
          <span className="eyebrow">Account recovery</span>
          <h1 className="headline">Choose a new password</h1>
        </section>
        <section className="panel login-card">
          {status && <div className="alert success section" role="status">{status}</div>}
          <form className="detail-list" onSubmit={submit}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button className="button primary" type="submit">Update password</button>
          </form>
          <Link className="button ghost" href="/login">Back to login</Link>
        </section>
      </main>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="container"><div className="panel">Loading...</div></main>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/useAuth";

function VerifyContent() {
  const params = useSearchParams();
  const { token: authToken, user, logout } = useAuth();
  const [status, setStatus] = useState(() =>
    params.get("token") ? "Verifying your email..." : "The verification link is missing or invalid."
  );
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) return;
    apiRequest<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(response => {
        setStatus(response.message);
        setVerified(true);
      })
      .catch((err: unknown) => {
        setStatus(err instanceof Error ? err.message : "Verification failed");
      });
  }, [params]);

  return (
    <>
      <TopNav user={user} token={authToken} onLogout={logout} />
      <main className="container login-shell">
        <section className="hero-panel hero login-hero">
          <span className="eyebrow">Email verification</span>
          <h1 className="headline">{verified ? "Email verified" : "Verify your email"}</h1>
        </section>
        <section className={`alert ${verified ? "success" : "warning"} section`} role="status">
          {status}
        </section>
        <Link className="button primary" href="/login">Go to login</Link>
      </main>
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="container"><div className="panel">Loading...</div></main>}>
      <VerifyContent />
    </Suspense>
  );
}

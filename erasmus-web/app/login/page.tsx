"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import type { User } from "../lib/types";

const ALLOWED_EMAIL_DOMAINS = ["@ibu.edu.ba", "@stu.ibu.edu.ba"];
const UNIVERSITY_EMAIL_MESSAGE =
  "Use a university email address ending in @ibu.edu.ba or @stu.ibu.edu.ba.";

const isUniversityEmail = (email: string) =>
  ALLOWED_EMAIL_DOMAINS.some(domain => email.trim().toLowerCase().endsWith(domain));

export default function LoginPage() {
  const router = useRouter();
  const { token, user, setToken, setUser, logout } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  useEffect(() => {
    if (!user) return;
    const target = user.role === "admin" ? "/admin" : "/student";
    router.replace(target);
  }, [user, router]);

  const handleLogin = async () => {
    setStatus(null);
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setStatus("Email and password are required.");
      return;
    }
    if (!isUniversityEmail(loginForm.email)) {
      setStatus(UNIVERSITY_EMAIL_MESSAGE);
      return;
    }
    try {
      const response = await apiRequest<{
        access_token: string;
        user: User;
        requires_2fa?: boolean;
        two_factor_token?: string | null;
      }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: loginForm.email.trim(),
            password: loginForm.password,
          }),
        }
      );
      if (response.requires_2fa && response.two_factor_token) {
        setTwoFactorToken(response.two_factor_token);
        setStatus("Enter the six-digit code from your authenticator app.");
        return;
      }
      setToken(response.access_token);
      setUser(response.user);
      router.push(response.user.role === "admin" ? "/admin" : "/student");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    }
  };

  const handleTwoFactorSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!twoFactorToken) return;
    setStatus(null);
    try {
      const response = await apiRequest<{ access_token: string; user: User }>(
        "/auth/verify-2fa",
        {
          method: "POST",
          body: JSON.stringify({
            two_factor_token: twoFactorToken,
            code: twoFactorCode,
          }),
        }
      );
      setToken(response.access_token);
      setUser(response.user);
      router.push(response.user.role === "admin" ? "/admin" : "/student");
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Invalid 2FA code");
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleLogin();
  };

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container login-shell">
        <section className="hero-panel hero login-hero">
          <span className="eyebrow">Student Information System</span>
          <h1 className="headline">Login</h1>
          <p className="subhead">
            Use your university email address to access the portal.
          </p>
        </section>

        <section className="panel login-card">
          {status && <div className="alert error section">{status}</div>}
          {!twoFactorToken ? (
            <form className="detail-list" onSubmit={handleLoginSubmit}>
              <h2 className="panel-title">Sign in</h2>
              <input
                placeholder="Email"
                value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                type="email"
                autoComplete="email"
                required
              />
              <input
                placeholder="Password"
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                autoComplete="current-password"
                required
              />
              <Link className="button ghost" href="/forgot-password">
                Forgot password?
              </Link>
              <button className="button primary" type="submit">
                Login
              </button>
            </form>
          ) : (
            <form className="detail-list" onSubmit={handleTwoFactorSubmit}>
              <h2 className="panel-title">Two-factor verification</h2>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="6-digit authenticator code"
                value={twoFactorCode}
                onChange={event => setTwoFactorCode(event.target.value)}
                autoComplete="one-time-code"
                required
              />
              <button className="button primary" type="submit">
                Verify and continue
              </button>
            </form>
          )}

          <div className="divider" />

          <div className="section-heading">
            <p className="panel-note">You don&apos;t have an account?</p>
            <Link className="button" href="/register">
              Register now
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

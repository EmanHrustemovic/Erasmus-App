"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/useAuth";
type SetupResponse = {
  secret: string;
  otpauth_uri: string;
  qr_code: string;
};

export default function SecurityPage() {
  const { token, user, setUser, logout } = useAuth();
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    if (!token) return;
    setLoading(true);
    setStatus(null);
    try {
      const response = await apiRequest<SetupResponse>("/auth/2fa/setup", { method: "POST" }, token);
      setSetup(response);
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Could not start 2FA setup");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!token) return;
    setLoading(true);
    setStatus(null);
    try {
      const response = await apiRequest<{ message: string }>(
        "/auth/2fa/confirm",
        { method: "POST", body: JSON.stringify({ code }) },
        token
      );
      setStatus(response.message);
      if (user) setUser({ ...user, two_factor_enabled: true });
      setSetup(null);
      setCode("");
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Could not enable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    if (!token) return;
    setLoading(true);
    setStatus(null);
    try {
      const response = await apiRequest<{ message: string }>(
        "/auth/2fa/disable",
        { method: "POST", body: JSON.stringify({ code }) },
        token
      );
      setStatus(response.message);
      if (user) setUser({ ...user, two_factor_enabled: false });
      setCode("");
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Could not disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!token) return;
    setLoading(true);
    setStatus(null);
    try {
      const response = await apiRequest<{ message: string }>(
        "/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        },
        token
      );
      setStatus(response.message);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  };

  if (!user || !token) {
    return (
      <main className="container">
        <section className="panel">
          <h1 className="section-title">Login required</h1>
          <Link className="button primary" href="/login">Go to login</Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container login-shell">
        <section className="hero-panel hero login-hero">
          <span className="eyebrow">Account security</span>
          <h1 className="headline">Protect your account</h1>
          <p className="subhead">Use an authenticator app and scan the QR code to secure your student or admin account.</p>
        </section>
        <section className="panel login-card">
          {status && <div className="alert success section" role="status">{status}</div>}
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Two-factor authentication</h2>
              <p className="panel-note">
                Status: {user.two_factor_enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
          {!user.two_factor_enabled && !setup && (
            <button className="button primary" onClick={startSetup} disabled={loading}>
              {loading ? "Preparing..." : "Set up 2FA"}
            </button>
          )}
          {setup && (
            <div className="detail-list">
              <Image
                src={setup.qr_code}
                alt="QR code for authenticator setup"
                width={220}
                height={220}
                unoptimized
              />
              <p className="muted">Scan the QR code, then enter the six-digit code from your authenticator app.</p>
              <div className="card">
                <strong>Manual setup key</strong>
                <div className="meta">{setup.secret}</div>
              </div>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="6-digit code"
                value={code}
                onChange={event => setCode(event.target.value)}
              />
              <button className="button primary" onClick={confirm} disabled={loading}>
                Confirm 2FA
              </button>
            </div>
          )}
          {user.two_factor_enabled && (
            <div className="detail-list">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Current 6-digit code"
                value={code}
                onChange={event => setCode(event.target.value)}
              />
              <button className="button danger" onClick={disable} disabled={loading}>
                Disable 2FA
              </button>
            </div>
          )}
          <div className="divider" />
          <div className="detail-list">
            <h2 className="panel-title">Change password</h2>
            <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            />
            <input
            type="password"
            placeholder="New password (minimum 8 characters)"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            />
            <button className="button" onClick={changePassword} disabled={loading}>
            Change password
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

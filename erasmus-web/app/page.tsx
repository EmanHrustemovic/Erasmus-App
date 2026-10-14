"use client";

import Link from "next/link";
import TopNav from "./components/TopNav";
import { useAuth } from "./lib/useAuth";

export default function Home() {
  const { token, user, logout } = useAuth();

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container">
        <section className="page-hero">
          <div className="hero-panel hero">
            <span className="eyebrow">Erasmus mobility hub</span>
            <h1 className="headline">A clean portal for Erasmus mobility work.</h1>
            <p className="subhead">
              Track calls, applications, and messages in one official workspace.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href="/calls">
                Browse calls
              </Link>
              {!user && (
                <Link className="button" href="/login">
                  Login / Register
                </Link>
              )}
              {user?.role === "student" && (
                <Link className="button" href="/student">
                  Open student dashboard
                </Link>
              )}
              {user?.role === "admin" && (
                <Link className="button" href="/admin">
                  Open admin panel
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Quick access</h2>
                <p className="panel-note">Just the essentials.</p>
              </div>
            </div>
            <div className="link-row">
              <Link className="button primary" href="/login">
                Login
              </Link>
              <Link className="button" href="/calls">
                Calls
              </Link>
              <Link className="button" href="/student">
                Student dashboard
              </Link>
              <Link className="button" href="/admin">
                Admin panel
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

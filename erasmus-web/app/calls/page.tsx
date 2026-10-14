"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { buildCountryOptions, createCountryMap, formatCountry } from "../lib/countries";
import { useAuth } from "../lib/useAuth";
import type { ErasmusCall, Notification } from "../lib/types";

export default function CallsPage() {
  const { token, user, logout } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [calls, setCalls] = useState<ErasmusCall[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedCall, setSelectedCall] = useState<ErasmusCall | null>(null);
  const countryOptions = useMemo(() => buildCountryOptions(), []);
  const countryMap = useMemo(() => createCountryMap(countryOptions), [countryOptions]);
  const openCallCount = calls.length;
  const notificationCount = notifications.length;

  const refreshData = async (activeToken: string) => {
    try {
      const [callsData, notificationData] = await Promise.all([
        apiRequest<ErasmusCall[]>("/calls", {}, activeToken),
        apiRequest<Notification[]>("/notifications", {}, activeToken),
      ]);
      setCalls(callsData);
      setNotifications(notificationData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    }
  };

  useEffect(() => {
    if (!token || !user) return;
    const timer = setTimeout(() => {
      void refreshData(token);
    }, 0);
    return () => clearTimeout(timer);
  }, [token, user]);


  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container">
        <section className="page-hero">
          <div className="hero-panel hero">
            <span className="eyebrow">Calls overview</span>
            <h1 className="headline">Browse Erasmus calls with a cleaner, premium layout.</h1>
            <p className="subhead">
              Compare deadlines, GPA thresholds, and required documents before moving to
              the student dashboard.
            </p>
            <div className="hero-actions">
              <Link
                className="button primary"
                href={
                  user?.role === "student"
                    ? "/student"
                    : user?.role === "admin"
                    ? "/admin"
                    : "/login"
                }
              >
                {user?.role === "student"
                  ? "Open student dashboard"
                  : user?.role === "admin"
                  ? "Open admin panel"
                  : "Login to apply"}
              </Link>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{openCallCount}</span>
              <span className="stat-label">open calls available</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{notificationCount}</span>
              <span className="stat-label">latest notifications</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">Filtered</span>
              <span className="stat-label">by country, deadline, and details</span>
            </div>
          </div>
        </section>

        {!user && (
          <section className="alert warning section">
            <div className="section-heading" style={{ marginBottom: 8 }}>
              <strong>Login required</strong>
            </div>
            <p className="muted">
              You can preview the portal, but sign in to see live notifications and call
              interactions.
            </p>
            <Link className="button primary" href="/login">
              Go to login
            </Link>
          </section>
        )}

        {user?.role === "admin" && (
          <section className="alert section">
            <strong>Admin access</strong>
            <p className="muted">
              Manage and publish calls from the admin panel, then return here to preview
              the public-facing view.
            </p>
            <Link className="button primary" href="/admin">
              Open admin panel
            </Link>
          </section>
        )}

        {status && <div className="alert error section">{status}</div>}

        {user && (
          <div className="split">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Notifications</h2>
                  <p className="panel-note">System messages and updates.</p>
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="empty-state">No notifications yet.</div>
              ) : (
                <div className="detail-list">
                  {notifications.map(item => (
                    <div key={item.id} className="card">
                      <div className="toolbar" style={{ alignItems: "start" }}>
                        <div>
                          <strong>{item.title}</strong>
                          <div className="meta">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8 }}>{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Call details</h2>
                  <p className="panel-note">Select a call to review the full description.</p>
                </div>
              </div>
              {calls.length === 0 ? (
                <div className="empty-state">No calls available.</div>
              ) : (
                <div className="call-grid">
                  {calls.map(call => (
                    <button
                      key={call.id}
                      className={`card focus-card${selectedCall?.id === call.id ? " unread" : ""}`}
                      type="button"
                      onClick={() => setSelectedCall(call)}
                      style={{ width: "100%", textAlign: "left" }}
                    >
                      <div className="toolbar" style={{ alignItems: "start" }}>
                        <div>
                          <strong>{call.title}</strong>
                          <div className="meta">{formatCountry(call.country, countryMap)}</div>
                        </div>
                        <span className="status-pill pending">Open</span>
                      </div>
                      <div className="detail-list" style={{ marginTop: 10 }}>
                        <div className="meta">Deadline: {call.deadline}</div>
                        {typeof call.min_gpa === "number" && call.min_gpa > 0 && (
                          <div className="meta">Minimum GPA: {call.min_gpa}</div>
                        )}
                        {call.erasmus_email && (
                          <div className="meta">Contact: {call.erasmus_email}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedCall && (
                <div className="panel" style={{ marginTop: 16 }}>
                  <div className="panel-header">
                    <div>
                      <h3 className="panel-title">{selectedCall.title}</h3>
                      <p className="panel-note">{formatCountry(selectedCall.country, countryMap)}</p>
                    </div>
                    <button className="button small" onClick={() => setSelectedCall(null)}>
                      Close
                    </button>
                  </div>
                  <div className="detail-list">
                    <div className="chip-row">
                      <span className="chip neutral">Deadline {selectedCall.deadline}</span>
                      {typeof selectedCall.min_gpa === "number" && selectedCall.min_gpa > 0 && (
                        <span className="chip">GPA {selectedCall.min_gpa}</span>
                      )}
                    </div>
                    <p>{selectedCall.description}</p>
                    <a className="button primary" href={selectedCall.link} target="_blank" rel="noreferrer">
                      Official link
                    </a>
                    {user.role === "student" && (
                      <div className="alert warning">
                        Applications are completed in the student dashboard where document
                        uploads and validation are enabled.
                        <div className="link-row" style={{ marginTop: 12 }}>
                          <Link className="button primary" href="/student">
                            Go to student dashboard
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}

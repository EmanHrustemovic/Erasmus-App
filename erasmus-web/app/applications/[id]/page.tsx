"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import TopNav from "../../components/TopNav";
import { apiRequest, API_URL } from "../../lib/api";
import { useAuth } from "../../lib/useAuth";
import { buildCountryOptions, createCountryMap, formatCountry } from "../../lib/countries";
import type { Application, ApplicationDetail, ApplicationStatusHistory } from "../../lib/types";
import { DOCUMENT_LABELS } from "../../lib/documents";

export default function ApplicationDetailsPage() {
  const params = useParams();
  const applicationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { token, user, logout } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [data, setData] = useState<ApplicationDetail | null>(null);
  const [history, setHistory] = useState<ApplicationStatusHistory[]>([]);
  const countryOptions = useMemo(() => buildCountryOptions(), []);
  const countryMap = useMemo(() => createCountryMap(countryOptions), [countryOptions]);

  useEffect(() => {
    if (!token || !user || user.role !== "admin" || !applicationId) return;
    apiRequest<ApplicationDetail>(`/applications/${applicationId}`, {}, token)
      .then(setData)
      .catch(err => {
        const message = err instanceof Error ? err.message : "Request failed";
        setStatus(message);
      });
    apiRequest<ApplicationStatusHistory[]>(
      `/applications/${applicationId}/history`,
      {},
      token
    )
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [token, user, applicationId]);

  const reviewApplication = async (nextStatus: "approved" | "rejected") => {
    if (!token || !data) return;
    setActionStatus(null);
    setDecisionError(null);
    const reason = decisionReason.trim();
    if (nextStatus === "rejected" && !reason) {
      setDecisionError("Rejection reason is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await apiRequest<Application>(
        `/applications/${data.id}/review`,
        {
          method: "POST",
          body: JSON.stringify(
            reason ? { status: nextStatus, reason } : { status: nextStatus }
          ),
        },
        token
      );
      setData(current =>
        current
          ? {
              ...current,
              status: updated.status,
              reviewed_at: updated.reviewed_at ?? null,
              reviewed_by_email: updated.reviewed_by_email ?? null,
              decision_reason: updated.decision_reason ?? null,
            }
          : current
      );
      const updatedHistory = await apiRequest<ApplicationStatusHistory[]>(
        `/applications/${data.id}/history`,
        {},
        token
      );
      setHistory(updatedHistory);
      setActionStatus(`Application ${updated.status}.`);
      setDecisionReason("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setActionStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadAllDocuments = async () => {
    if (!token || !data) return;
    setActionStatus(null);
    try {
      const res = await fetch(`${API_URL}/applications/${data.id}/documents.zip`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Download failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `application_${data.id}_documents.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setActionStatus(message);
    }
  };

  const downloadDocument = async (docId: number, filename: string) => {
    if (!token) return;
    setActionStatus(null);
    try {
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Download failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setActionStatus(message);
    }
  };

  const previewDocument = async (docId: number) => {
    if (!token) return;
    setActionStatus(null);
    try {
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Preview failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Preview failed";
      setActionStatus(message);
    }
  };

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container">
        <section className="page-hero">
          <div className="hero-panel hero">
            <span className="eyebrow">Application details</span>
            <h1 className="headline">Full student application and call information.</h1>
            <p className="subhead">
              Review the candidate, inspect the attachments, and approve or reject with
              a clean audit trail.
            </p>
          </div>
        </section>

        {!user && (
          <section className="alert warning section">
            <p>You need to log in as admin to view this application.</p>
            <Link className="button primary" href="/login">
              Go to login
            </Link>
          </section>
        )}

        {user?.role === "student" && (
          <section className="alert section">
            <p className="muted">Only admins can view application details.</p>
            <Link className="button primary" href="/student">
              Back to dashboard
            </Link>
          </section>
        )}

        {status && <div className="alert error section">{status}</div>}

        {actionStatus && <div className="alert warning section">{actionStatus}</div>}

        {user?.role === "admin" && data && (
          <div className="split">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Student info</h2>
                  <p className="panel-note">Personal and submission details.</p>
                </div>
                <span className={`status-pill ${data.status}`}>{data.status}</span>
              </div>
              <div className="detail-list">
                <div>Email: {data.user_email}</div>
                <div>Name: {data.full_name}</div>
                <div>Department: {data.department}</div>
                <div>GPA: {data.gpa}</div>
                <div>Phone: {data.phone}</div>
                {data.notes && <div>Notes: {data.notes}</div>}
                {data.decision_reason && (
                  <div className="alert">
                    <strong>Decision reason:</strong> {data.decision_reason}
                  </div>
                )}
                <div className="meta">Submitted: {new Date(data.created_at).toLocaleString()}</div>
                {data.reviewed_at && (
                  <div className="meta">Reviewed: {new Date(data.reviewed_at).toLocaleString()}</div>
                )}
                {data.reviewed_by_email && (
                  <div className="meta">Updated by: {data.reviewed_by_email}</div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Call details</h2>
                  <p className="panel-note">The call this application belongs to.</p>
                </div>
              </div>
              <div className="detail-list">
                <div>
                  <strong>{data.call_title}</strong>
                </div>
                <div className="meta">{formatCountry(data.call_country, countryMap)}</div>
                <div className="meta">Deadline: {data.call_deadline}</div>
                <p>{data.call_description}</p>
                {data.call_erasmus_email && <div className="meta">Erasmus: {data.call_erasmus_email}</div>}
                <a className="button" href={data.call_link} target="_blank" rel="noreferrer">
                  Official link
                </a>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Documents</h2>
                  <p className="panel-note">Download single files or the full bundle.</p>
                </div>
              </div>
              {data.documents.length === 0 ? (
                <div className="empty-state">No documents uploaded.</div>
              ) : (
                <>
                  <div className="link-row" style={{ marginBottom: 12 }}>
                    <button className="button" onClick={downloadAllDocuments}>
                      Download all (ZIP)
                    </button>
                  </div>
                  <div className="detail-list">
                    {data.documents.map(doc => (
                      <div key={doc.id} className="card">
                        <div className="toolbar" style={{ alignItems: "start" }}>
                          <div>
                            <strong>
                              {DOCUMENT_LABELS[doc.doc_type as keyof typeof DOCUMENT_LABELS] ??
                                doc.doc_type}
                            </strong>
                            <div className="meta">
                              {doc.original_name} · {(doc.size / 1024).toFixed(0)} KB
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <div className="link-row">
                            <button className="button" onClick={() => void previewDocument(doc.id)}>
                              Preview
                            </button>
                            <button className="button" onClick={() => void downloadDocument(doc.id, doc.original_name)}>
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Decision</h2>
                  <p className="panel-note">Approve or reject this application.</p>
                </div>
              </div>
              {data.status === "pending" ? (
                <>
                  <textarea
                    placeholder="Rejection reason (required for reject)"
                    value={decisionReason}
                    onChange={event => {
                      setDecisionReason(event.target.value);
                      setDecisionError(null);
                    }}
                  />
                  {decisionError && <div className="field-error">{decisionError}</div>}
                  <div className="form-actions" style={{ marginTop: 8 }}>
                    <button
                      className="button primary"
                      onClick={() => reviewApplication("approved")}
                      disabled={isSubmitting}
                    >
                      Approve
                    </button>
                    <button
                      className="button"
                      onClick={() => reviewApplication("rejected")}
                      disabled={isSubmitting}
                    >
                      Reject
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">Application already reviewed.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">History</h2>
                  <p className="panel-note">Previous status changes for this application.</p>
                </div>
              </div>
              {history.length === 0 ? (
                <div className="empty-state">No history entries yet.</div>
              ) : (
                <div className="detail-list">
                  {history.map(entry => (
                    <div key={entry.id} className="card">
                      <div className="toolbar" style={{ alignItems: "start" }}>
                        <div>
                          <strong>{entry.status}</strong>
                          <div className="meta">
                            {new Date(entry.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span className="status-pill neutral">{entry.changed_by_role}</span>
                      </div>
                      <div className="meta">By: {entry.changed_by_email}</div>
                      {entry.reason && <div style={{ marginTop: 8 }}>{entry.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="section">
              <Link className="button" href="/admin">
                Back to admin
              </Link>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

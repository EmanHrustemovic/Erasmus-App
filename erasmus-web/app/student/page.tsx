"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TopNav from "../components/TopNav";
import { apiRequest, API_URL } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import { buildCountryOptions, createCountryMap, formatCountry } from "../lib/countries";
import {
  DOCUMENT_KEYS,
  DOCUMENT_LABELS,
  DOC_UPLOAD_FIELDS,
  type DocumentKey,
} from "../lib/documents";
import type { Application, ErasmusCall, Notification } from "../lib/types";

const FILE_ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png";
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿĀ-ž .'-]+$/;
const PHONE_PATTERN = /^\+?\d{6,20}$/;
const ALERT_DAYS = new Set([7, 3, 1]);
const DRAFT_STORAGE_KEY = "erasmus-student-application-draft";

type FileFieldProps = {
  label: string;
  inputKey: string;
  file: File | null;
  error?: string;
  required?: boolean;
  onChange: (file: File | null) => void;
};

type FieldErrors = Partial<
  Record<
    | "full_name"
    | "phone"
    | "department"
    | "gpa"
    | "cv"
    | "transcript"
    | "motivation"
    | "language_proof"
    | "recommendation"
    | "learning_agreement"
    | "id_copy"
    | "application_form",
    string
  >
>;

function FileField({ label, inputKey, file, error, required, onChange }: FileFieldProps) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
        {!required && (
          <span className="muted" style={{ fontSize: 12 }}>
            (optional)
          </span>
        )}
      </div>
      <label className="button" style={{ width: "fit-content" }}>
        Choose file
        <input
          key={inputKey}
          type="file"
          accept={FILE_ACCEPT}
          onChange={e => onChange(e.target.files?.[0] ?? null)}
          style={{ display: "none" }}
        />
      </label>
      <div className="muted" style={{ fontSize: 12 }}>
        {file ? file.name : "No file selected"}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

const parseDeadline = (value: string) => {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const getDaysLeft = (value: string) => {
  const deadline = parseDeadline(value);
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - today.getTime()) / 86400000);
};

const formatDaysLeft = (days: number) => {
  if (days < 0) return "Deadline passed";
  if (days === 0) return "Deadline today";
  return `${days} day${days === 1 ? "" : "s"} left`;
};

const DEFAULT_APPLY_FORM = {
  full_name: "",
  phone: "",
  department: "",
  gpa: "",
  notes: "",
};

export default function StudentDashboard() {
  const { token, user, logout } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const formStatusRef = useRef<HTMLDivElement | null>(null);
  const [calls, setCalls] = useState<ErasmusCall[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [activeSection, setActiveSection] = useState<
    "overview" | "notifications" | "calls" | "apply" | "applications"
  >("overview");
  const visibleApplications = applications.filter(item => item.status !== "withdrawn");
  const [applyForm, setApplyForm] = useState(DEFAULT_APPLY_FORM);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [motivationFile, setMotivationFile] = useState<File | null>(null);
  const [languageProofFile, setLanguageProofFile] = useState<File | null>(null);
  const [recommendationFile, setRecommendationFile] = useState<File | null>(null);
  const [learningAgreementFile, setLearningAgreementFile] = useState<File | null>(null);
  const [idCopyFile, setIdCopyFile] = useState<File | null>(null);
  const [applicationFormFile, setApplicationFormFile] = useState<File | null>(null);
  const countryOptions = useMemo(() => buildCountryOptions(), []);
  const countryMap = useMemo(() => createCountryMap(countryOptions), [countryOptions]);
  const selectedCall = useMemo(
    () => calls.find(call => call.id === selectedCallId) ?? null,
    [calls, selectedCallId]
  );
  const filledRequiredTextFields = ["full_name", "phone", "department", "gpa"].filter(
    field => applyForm[field as keyof typeof applyForm].toString().trim() !== ""
  ).length;
  const requiredDocs = useMemo(() => {
    const rawDocs = selectedCall?.required_docs ?? [];
    const normalized = rawDocs
      .map(item => item.trim().toLowerCase())
      .filter((item): item is DocumentKey => DOCUMENT_KEYS.includes(item as DocumentKey));
    return normalized.length > 0 ? normalized : DOCUMENT_KEYS;
  }, [selectedCall]);
  const selectedDaysLeft = selectedCall ? getDaysLeft(selectedCall.deadline) : null;
  const showDeadlineAlert =
    selectedDaysLeft !== null && ALERT_DAYS.has(selectedDaysLeft);
  const selectedDocFiles = useMemo(
    () =>
      ({
        cv: cvFile,
        transcript: transcriptFile,
        motivation: motivationFile,
        language_proof: languageProofFile,
        recommendation: recommendationFile,
        learning_agreement: learningAgreementFile,
        id_copy: idCopyFile,
        application_form: applicationFormFile,
      }) as Record<DocumentKey, File | null>,
    [
      applicationFormFile,
      cvFile,
      idCopyFile,
      languageProofFile,
      learningAgreementFile,
      motivationFile,
      recommendationFile,
      transcriptFile,
    ]
  );
  const selectedRequiredDocCount = selectedCall ? requiredDocs.length : 0;
  const completedRequiredDocCount = selectedCall
    ? requiredDocs.filter(doc => Boolean(selectedDocFiles[doc])).length
    : 0;
  const formProgressBase =
    selectedCall === null
      ? 0
      : Math.round(
          (filledRequiredTextFields / 4) * 55 +
            (selectedRequiredDocCount === 0
              ? 0
              : (completedRequiredDocCount / selectedRequiredDocCount) * 45)
        );
  const formCompletion = Math.max(0, Math.min(100, formProgressBase));

  const refreshData = async (activeToken: string) => {
    try {
      const [callsData, notificationData, applicationData] = await Promise.all([
        apiRequest<ErasmusCall[]>("/calls", {}, activeToken),
        apiRequest<Notification[]>("/notifications", {}, activeToken),
        apiRequest<Application[]>("/applications/me", {}, activeToken),
      ]);
      setCalls(callsData);
      setNotifications(notificationData);
      setApplications(applicationData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    }
  };

  useEffect(() => {
    if (!token || !user || user.role !== "student") return;
    const timer = setTimeout(() => {
      void refreshData(token);
    }, 0);
    return () => clearTimeout(timer);
  }, [token, user]);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    if (!selectedCall && Object.values(applyForm).every(value => value.trim() === "")) {
      return;
    }
    const payload = {
      selectedCallId: selectedCall?.id ?? null,
      applyForm,
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  }, [applyForm, selectedCall, user]);

  useEffect(() => {
    if (!user || user.role !== "student" || typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        const draft = JSON.parse(raw) as {
          selectedCallId?: number | null;
          applyForm?: typeof DEFAULT_APPLY_FORM;
        };
        if (draft.applyForm) {
          setApplyForm(prev => ({ ...prev, ...draft.applyForm }));
        }
        if (typeof draft.selectedCallId === "number") {
          setSelectedCallId(draft.selectedCallId);
        }
      } catch {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const uploadApplication = (
    callId: number,
    formData: FormData,
    authToken: string
  ) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/calls/${callId}/apply`);
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      xhr.responseType = "json";
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };
      xhr.onerror = () => reject(new Error("Request failed"));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }
        const contentType = xhr.getResponseHeader("content-type") || "";
        const responseData =
          contentType.includes("application/json") && xhr.response
            ? xhr.response
            : xhr.responseText;
        const message =
          typeof responseData === "object" &&
          responseData &&
          "detail" in responseData
            ? String((responseData as { detail?: string }).detail || "Request failed")
            : typeof responseData === "string" && responseData.trim()
              ? responseData
              : "Request failed";
        reject(new Error(message));
      };
      xhr.send(formData);
    });

  const scrollToFormStatus = () => {
    window.requestAnimationFrame(() => {
      formStatusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const submitApplication = async (callId: number) => {
    if (!token) return;
    setStatus(null);
    setFormStatus(null);
    setFieldErrors({});
    const nextErrors: FieldErrors = {};
    const fullName = applyForm.full_name.trim();
    const phoneNumber = applyForm.phone.trim();
    const department = applyForm.department.trim();
    if (!fullName) {
      nextErrors.full_name = "Full name is required.";
    } else if (!NAME_PATTERN.test(fullName)) {
      nextErrors.full_name = "Name can only contain letters, spaces, dots, and hyphens.";
    } else {
      const parts = fullName.split(/\s+/).filter(Boolean);
      const shortPart = parts.some(p => p.replace(/[^A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/g, "").length < 2);
      if (parts.length < 2 || shortPart) {
        nextErrors.full_name = "Please provide your full name (first and last name), each at least 2 letters.";
      }
    }
    if (!phoneNumber) {
      nextErrors.phone = "Phone number is required.";
    } else if (!PHONE_PATTERN.test(phoneNumber)) {
      nextErrors.phone = "Phone must contain only digits and an optional leading '+'.";
    }
    if (!department) {
      nextErrors.department = "Department is required.";
    }
    const gpaValue = Number(applyForm.gpa);
    const minGpa = selectedCall?.min_gpa ?? 0;
    if (Number.isNaN(gpaValue) || gpaValue < 0 || gpaValue > 10) {
      nextErrors.gpa = "GPA must be between 0 and 10.";
    } else if (gpaValue < minGpa) {
      nextErrors.gpa = `Minimum GPA for this call is ${minGpa}.`;
    }
    const docFiles: Record<DocumentKey, File | null> = {
      cv: cvFile,
      transcript: transcriptFile,
      motivation: motivationFile,
      language_proof: languageProofFile,
      recommendation: recommendationFile,
      learning_agreement: learningAgreementFile,
      id_copy: idCopyFile,
      application_form: applicationFormFile,
    };
    requiredDocs.forEach(doc => {
      if (!docFiles[doc]) {
        nextErrors[doc] = `${DOCUMENT_LABELS[doc]} is required.`;
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const message = "Please fix the highlighted fields.";
      setStatus(message);
      setFormStatus(message);
      scrollToFormStatus();
      return;
    }
    try {
      setIsSubmitting(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("full_name", fullName);
      formData.append("phone", phoneNumber);
      formData.append("department", department);
      formData.append("gpa", String(gpaValue));
      if (applyForm.notes.trim()) {
        formData.append("notes", applyForm.notes.trim());
      }
      Object.entries(docFiles).forEach(([key, file]) => {
        if (file) {
          formData.append(DOC_UPLOAD_FIELDS[key as DocumentKey], file);
        }
      });
      await uploadApplication(callId, formData, token);
      setApplyForm({ full_name: "", phone: "", department: "", gpa: "", notes: "" });
      setCvFile(null);
      setTranscriptFile(null);
      setMotivationFile(null);
      setLanguageProofFile(null);
      setRecommendationFile(null);
      setLearningAgreementFile(null);
      setIdCopyFile(null);
      setApplicationFormFile(null);
      setFieldErrors({});
      setFileInputKey(prev => prev + 1);
      setStatus("Application sent.");
      setFormStatus("Application sent.");
      await refreshData(token);
      scrollToFormStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
      setFormStatus(message);
      scrollToFormStatus();
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const withdrawApplication = async (applicationId: number) => {
    if (!token) return;
    setStatus(null);
    setWithdrawingId(applicationId);
    try {
      await apiRequest<Application>(
        `/applications/${applicationId}/withdraw`,
        { method: "POST" },
        token
      );
      setStatus("Application withdrawn.");
      await refreshData(token);
      scrollToFormStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container">

        {!user && (
          <section className="alert warning section">
            <p>You need to log in to access the student dashboard.</p>
            <Link className="button primary" href="/login">
              Go to login
            </Link>
          </section>
        )}

        {user?.role === "admin" && (
          <section className="alert section">
            <p className="muted">
              You are logged in as admin. Student dashboard is for student accounts.
            </p>
            <Link className="button primary" href="/admin">
              Open admin panel
            </Link>
          </section>
        )}

        {status && (
          <div className="alert error section">
            {status}
          </div>
        )}

        {user?.role === "student" && (
          <div className="dashboard-shell">
            <aside className="dashboard-sidebar">
              <div className="dashboard-sidebar-card">
                <p className="dashboard-sidebar-title">Student portal</p>
                <nav className="dashboard-nav">
                  <a className="dashboard-nav-link" href="#overview">
                    Overview <small>{calls.length} calls</small>
                  </a>
                  <a className="dashboard-nav-link" href="#notifications">
                    Notifications <small>{notifications.length}</small>
                  </a>
                  <a className="dashboard-nav-link" href="#open-calls">
                    Open calls <small>{selectedCall ? "1 selected" : "browse"}</small>
                  </a>
                  <a className="dashboard-nav-link" href="#call-details">
                    Application form <small>draft saved</small>
                  </a>
                  <a className="dashboard-nav-link" href="#my-applications">
                    My applications <small>{visibleApplications.length}</small>
                  </a>
                </nav>
              </div>
              <div className="dashboard-sidebar-card">
                <p className="dashboard-sidebar-title">At a glance</p>
                <div className="dashboard-kpi">
                  <div className="dashboard-kpi-item">
                    <span className="dashboard-kpi-value">{calls.length}</span>
                    <span className="dashboard-kpi-label">available calls</span>
                  </div>
                  <div className="dashboard-kpi-item">
                    <span className="dashboard-kpi-value">{notifications.length}</span>
                    <span className="dashboard-kpi-label">new notifications</span>
                  </div>
                  <div className="dashboard-kpi-item">
                    <span className="dashboard-kpi-value">{visibleApplications.length}</span>
                    <span className="dashboard-kpi-label">active applications</span>
                  </div>
                </div>
              </div>
            </aside>

            <div className="dashboard-main">
              <section className="page-hero" id="overview">
                <div className="hero-panel hero">
                  <span className="eyebrow">Student dashboard</span>
                  <h1 className="headline">
                    Everything a student needs, arranged more clearly.
                  </h1>
                  <p className="subhead">
                    Review calls, upload documents, track status changes, and keep a draft
                    saved while you work.
                  </p>
                  <div className="hero-actions">
                    <Link className="button primary" href="#open-calls">
                      Explore calls
                    </Link>
                    <Link className="button" href="#my-applications">
                      My applications
                    </Link>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value">{calls.length}</span>
                    <span className="stat-label">available calls</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{notifications.length}</span>
                    <span className="stat-label">notifications</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{visibleApplications.length}</span>
                    <span className="stat-label">active applications</span>
                  </div>
                </div>
              </section>

              <div className="portal-bar" role="tablist" aria-label="Student section navigation">
                <button
                  id="tab-overview"
                  role="tab"
                  aria-selected={activeSection === "overview"}
                  aria-controls="overview"
                  className={`portal-tab${activeSection === "overview" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("overview")}
                >
                  Overview
                </button>
                <button
                  id="tab-notifications"
                  role="tab"
                  aria-selected={activeSection === "notifications"}
                  aria-controls="notifications"
                  className={`portal-tab${activeSection === "notifications" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("notifications")}
                >
                  Notifications <small>{notifications.length}</small>
                </button>
                <button
                  id="tab-calls"
                  role="tab"
                  aria-selected={activeSection === "calls"}
                  aria-controls="open-calls"
                  className={`portal-tab${activeSection === "calls" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("calls")}
                >
                  Calls <small>{calls.length}</small>
                </button>
                <button
                  id="tab-apply"
                  role="tab"
                  aria-selected={activeSection === "apply"}
                  aria-controls="call-details"
                  className={`portal-tab${activeSection === "apply" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("apply")}
                >
                  Apply
                </button>
                <button
                  id="tab-applications"
                  role="tab"
                  aria-selected={activeSection === "applications"}
                  aria-controls="my-applications"
                  className={`portal-tab${activeSection === "applications" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("applications")}
                >
                  Applications <small>{visibleApplications.length}</small>
                </button>
              </div>

              {activeSection === "notifications" && (
              <section className="panel" id="notifications">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Notifications</h2>
                    <p className="panel-note">Latest portal updates and reminders.</p>
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
              )}

              {activeSection === "calls" && (
              <section className="panel" id="open-calls">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Open calls</h2>
                    <p className="panel-note">Pick a call to review before applying.</p>
                  </div>
                </div>
                {calls.length === 0 ? (
                  <div className="empty-state">No calls available.</div>
                ) : (
                  <div className="call-grid">
                    {calls.map(call => {
                      const daysLeft = getDaysLeft(call.deadline);
                      return (
                        <button
                          key={call.id}
                          className={`card focus-card${selectedCall?.id === call.id ? " unread" : ""}`}
                          type="button"
                          onClick={() => {
                            setFormStatus(null);
                            setFieldErrors({});
                            setSelectedCallId(call.id);
                          }}
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
                            {daysLeft !== null && (
                              <div className="meta">{formatDaysLeft(daysLeft)}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
              )}

              {activeSection === "apply" && selectedCall && (
                <section className="panel section" id="call-details">
                  <div className="panel-header">
                    <div>
                      <h2 className="panel-title">{selectedCall.title}</h2>
                      <p className="panel-note">
                        {formatCountry(selectedCall.country, countryMap)}
                      </p>
                    </div>
                    <button
                      className="button small"
                      type="button"
                      onClick={() => {
                        setFormStatus(null);
                        setFieldErrors({});
                        setSelectedCallId(null);
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div className="chip-row section">
                    <span className="chip neutral">Deadline {selectedCall.deadline}</span>
                    {selectedDaysLeft !== null && (
                      <span className="chip warning">{formatDaysLeft(selectedDaysLeft)}</span>
                    )}
                    {typeof selectedCall.min_gpa === "number" && selectedCall.min_gpa > 0 && (
                      <span className="chip">Min GPA {selectedCall.min_gpa}</span>
                    )}
                  </div>

                  {requiredDocs.length > 0 && (
                    <div className="alert section">
                      <strong>Required documents</strong>
                      <div className="chip-row" style={{ marginTop: 10 }}>
                        {requiredDocs.map(doc => (
                          <span key={doc} className="chip neutral">
                            {DOCUMENT_LABELS[doc] ?? doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {showDeadlineAlert && (
                    <div className="alert warning section">
                      {selectedDaysLeft === 0
                        ? "Deadline is today."
                        : `${selectedDaysLeft} day(s) left to apply.`}
                    </div>
                  )}

                  <p>{selectedCall.description}</p>
                  <div className="link-row section">
                    <a className="button" href={selectedCall.link} target="_blank" rel="noreferrer">
                      Official link
                    </a>
                  </div>

                  <div className="split section">
                    <div className="panel">
                      <div className="panel-header">
                        <div>
                          <h3 className="panel-title">Application checklist</h3>
                          <p className="panel-note">Your draft progress updates automatically.</p>
                        </div>
                      </div>
                      <div className="progress">
                        <div className="progress-bar" style={{ width: `${formCompletion}%` }} />
                      </div>
                      <div className="meta" style={{ marginTop: 8 }}>
                        {formCompletion}% complete
                      </div>
                      <div className="detail-list" style={{ marginTop: 12 }}>
                        <div className="chip-row">
                          <span className="chip neutral">
                            Profile fields {filledRequiredTextFields}/4
                          </span>
                          <span className="chip neutral">
                            Docs {completedRequiredDocCount}/{selectedRequiredDocCount || 1}
                          </span>
                        </div>
                        <p className="muted">
                          Keep the form open while you prepare documents. The draft is stored in
                          your browser.
                        </p>
                      </div>
                    </div>

                    <div className="panel">
                      <div className="panel-header">
                        <div>
                          <h3 className="panel-title">Apply</h3>
                          <p className="panel-note">Fill everything and upload the required files.</p>
                        </div>
                      </div>
                      <div ref={formStatusRef}>
                        {formStatus && (
                          <div className="alert warning section" role="status" aria-live="polite">
                            {formStatus}
                          </div>
                        )}
                      </div>
                      <div className="detail-list">
                        <input
                          placeholder="Full name"
                          value={applyForm.full_name}
                          onChange={e => {
                            setApplyForm({ ...applyForm, full_name: e.target.value });
                            clearFieldError("full_name");
                          }}
                          required
                        />
                        {fieldErrors.full_name && (
                          <div className="field-error">{fieldErrors.full_name}</div>
                        )}
                        <input
                          placeholder="Phone"
                          value={applyForm.phone}
                          onChange={e => {
                            setApplyForm({ ...applyForm, phone: e.target.value });
                            clearFieldError("phone");
                          }}
                          required
                        />
                        {fieldErrors.phone && (
                          <div className="field-error">{fieldErrors.phone}</div>
                        )}
                        <input
                          placeholder="Department"
                          value={applyForm.department}
                          onChange={e => {
                            setApplyForm({ ...applyForm, department: e.target.value });
                            clearFieldError("department");
                          }}
                          required
                        />
                        {fieldErrors.department && (
                          <div className="field-error">{fieldErrors.department}</div>
                        )}
                        <input
                          placeholder="GPA (0 - 10)"
                          type="number"
                          min="0"
                          max="10"
                          step="0.01"
                          value={applyForm.gpa}
                          onChange={e => {
                            setApplyForm({ ...applyForm, gpa: e.target.value });
                            clearFieldError("gpa");
                          }}
                          required
                        />
                        {fieldErrors.gpa && <div className="field-error">{fieldErrors.gpa}</div>}
                        <FileField
                          label="CV (Europass)"
                          inputKey={`cv-${fileInputKey}`}
                          file={cvFile}
                          error={fieldErrors.cv}
                          required={requiredDocs.includes("cv")}
                          onChange={file => {
                            setCvFile(file);
                            clearFieldError("cv");
                          }}
                        />
                        <FileField
                          label="Transcript of records"
                          inputKey={`transcript-${fileInputKey}`}
                          file={transcriptFile}
                          error={fieldErrors.transcript}
                          required={requiredDocs.includes("transcript")}
                          onChange={file => {
                            setTranscriptFile(file);
                            clearFieldError("transcript");
                          }}
                        />
                        <FileField
                          label="Motivation letter"
                          inputKey={`motivation-${fileInputKey}`}
                          file={motivationFile}
                          error={fieldErrors.motivation}
                          required={requiredDocs.includes("motivation")}
                          onChange={file => {
                            setMotivationFile(file);
                            clearFieldError("motivation");
                          }}
                        />
                        <FileField
                          label="Proof of language"
                          inputKey={`language-${fileInputKey}`}
                          file={languageProofFile}
                          error={fieldErrors.language_proof}
                          required={requiredDocs.includes("language_proof")}
                          onChange={file => {
                            setLanguageProofFile(file);
                            clearFieldError("language_proof");
                          }}
                        />
                        <FileField
                          label="Recommendation letter"
                          inputKey={`recommendation-${fileInputKey}`}
                          file={recommendationFile}
                          error={fieldErrors.recommendation}
                          required={requiredDocs.includes("recommendation")}
                          onChange={file => {
                            setRecommendationFile(file);
                            clearFieldError("recommendation");
                          }}
                        />
                        <FileField
                          label="Learning agreement"
                          inputKey={`agreement-${fileInputKey}`}
                          file={learningAgreementFile}
                          error={fieldErrors.learning_agreement}
                          required={requiredDocs.includes("learning_agreement")}
                          onChange={file => {
                            setLearningAgreementFile(file);
                            clearFieldError("learning_agreement");
                          }}
                        />
                        <FileField
                          label="Passport/ID copy"
                          inputKey={`id-${fileInputKey}`}
                          file={idCopyFile}
                          error={fieldErrors.id_copy}
                          required={requiredDocs.includes("id_copy")}
                          onChange={file => {
                            setIdCopyFile(file);
                            clearFieldError("id_copy");
                          }}
                        />
                        <FileField
                          label="Application form"
                          inputKey={`application-${fileInputKey}`}
                          file={applicationFormFile}
                          error={fieldErrors.application_form}
                          required={requiredDocs.includes("application_form")}
                          onChange={file => {
                            setApplicationFormFile(file);
                            clearFieldError("application_form");
                          }}
                        />
                        <textarea
                          placeholder="Notes (optional)"
                          value={applyForm.notes}
                          onChange={e => setApplyForm({ ...applyForm, notes: e.target.value })}
                        />
                      </div>
                      {isSubmitting && (
                        <div style={{ marginTop: 12 }}>
                          <div className="progress">
                            <div
                              className="progress-bar"
                              style={{ width: `${uploadProgress ?? 0}%` }}
                            />
                          </div>
                          <div className="meta" style={{ marginTop: 6 }}>
                            Uploading... {uploadProgress ?? 0}%
                          </div>
                        </div>
                      )}
                      <div className="form-actions" style={{ marginTop: 12 }}>
                        <button
                          className="button primary"
                          type="button"
                          onClick={() => submitApplication(selectedCall.id)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Submitting..." : "Submit application"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "applications" && (
              <section className="section" id="my-applications">
                <div className="section-heading">
                  <div>
                    <h2 className="section-title">My applications</h2>
                    <p className="section-description">
                      Track submitted applications and withdraw only pending ones.
                    </p>
                  </div>
                </div>
                {visibleApplications.length === 0 ? (
                  <div className="empty-state">No applications yet.</div>
                ) : (
                  <div className="grid">
                    {visibleApplications.map(item => (
                      <div key={item.id} className="card">
                        <div className="toolbar" style={{ alignItems: "start" }}>
                          <div>
                            <strong>{item.call_title}</strong>
                            <div className="meta">Submitted: {new Date(item.created_at).toLocaleString()}</div>
                          </div>
                          <span className={`status-pill ${item.status}`}>{item.status}</span>
                        </div>
                        <div className="detail-list" style={{ marginTop: 10 }}>
                          <div>Name: {item.full_name}</div>
                          <div>Department: {item.department}</div>
                          <div>Phone: {item.phone}</div>
                        </div>
                        {item.reviewed_at && (
                          <div className="meta" style={{ marginTop: 8 }}>
                            Reviewed: {new Date(item.reviewed_at).toLocaleString()}
                          </div>
                        )}
                        {item.reviewed_by_email && (
                          <div className="meta" style={{ marginTop: 4 }}>
                            Updated by: {item.reviewed_by_email}
                          </div>
                        )}
                        {item.notes && <div>Notes: {item.notes}</div>}
                        {item.decision_reason && (
                          <div className="alert" style={{ marginTop: 10 }}>
                            <strong>Decision reason:</strong> {item.decision_reason}
                          </div>
                        )}
                        {item.status === "pending" && (
                          <div className="form-actions" style={{ marginTop: 12 }}>
                            <button
                              className="button"
                              onClick={() => withdrawApplication(item.id)}
                              disabled={withdrawingId === item.id}
                            >
                              {withdrawingId === item.id ? "Withdrawing..." : "Withdraw"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import TopNav from "../components/TopNav";
import { apiRequest, API_URL } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import {
  buildCountryOptions,
  createCountryMap,
  findCountryOption,
  flagImageUrl,
  formatCountry,
} from "../lib/countries";
import { DOCUMENT_KEYS, DOCUMENT_TYPES, type DocumentKey } from "../lib/documents";
import type { Application, AuditLog, ErasmusCall, Notification, User } from "../lib/types";

export default function AdminPage() {
  const { token, user, logout } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [callErrors, setCallErrors] = useState<Record<string, string>>({});
  const [calls, setCalls] = useState<ErasmusCall[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected" | "withdrawn"
  >("all");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [reviewErrors, setReviewErrors] = useState<Record<number, string>>({});
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingNotificationId, setDeletingNotificationId] = useState<number | null>(
    null
  );
  const [activeSection, setActiveSection] = useState<
    "overview" | "new-call" | "current-calls" | "notifications" | "applications" | "audit-log"
  >("overview");
  const [callForm, setCallForm] = useState({
    title: "",
    country: "",
    description: "",
    deadline: "",
    link: "",
    erasmus_email: "",
    min_gpa: "",
    required_docs: DOCUMENT_KEYS,
  });
  const [countryQuery, setCountryQuery] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const callFormRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const countryRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const deadlineRef = useRef<HTMLInputElement | null>(null);
  const linkRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const minGpaRef = useRef<HTMLInputElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const countryOptions = useMemo(() => buildCountryOptions(), []);
  const countryMap = useMemo(() => createCountryMap(countryOptions), [countryOptions]);
  const selectedCountry = useMemo(
    () => findCountryOption(callForm.country, countryMap),
    [callForm.country, countryMap]
  );
  const filteredCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) {
      return countryOptions;
    }
    return countryOptions
      .filter(option =>
        option.name.toLowerCase().includes(query) ||
        option.code.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [countryOptions, countryQuery]);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return applications.filter(item => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      const haystack = [
        item.user_email,
        item.full_name,
        item.call_title,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [applications, searchQuery, statusFilter]);
  const pendingApplications = applications.filter(item => item.status === "pending").length;
  const unreadNotifications = notifications.length;
  const activeCalls = calls.length;
  const exportReady = applications.length;

  const handleCountryBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setIsCountryOpen(false);
  };

  const refreshData = async (activeToken: string, currentUser: User) => {
    try {
      const [callsData, notificationData] = await Promise.all([
        apiRequest<ErasmusCall[]>("/calls", {}, activeToken),
        apiRequest<Notification[]>("/notifications", {}, activeToken),
      ]);
      setCalls(callsData);
      setNotifications(notificationData);
      if (currentUser.role === "admin") {
        const [apps, logs] = await Promise.all([
          apiRequest<Application[]>("/applications", {}, activeToken),
          apiRequest<AuditLog[]>("/audit-log", {}, activeToken),
        ]);
        setApplications(apps);
        setAuditLogs(logs);
      } else {
        setApplications([]);
        setAuditLogs([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    }
  };

  const focusCallField = (field: keyof typeof callForm) => {
    const el =
      field === "title"
        ? titleRef.current
        : field === "country"
          ? countryRef.current
          : field === "description"
            ? descriptionRef.current
            : field === "deadline"
              ? deadlineRef.current
              : field === "link"
                ? linkRef.current
                : field === "erasmus_email"
                  ? emailRef.current
                  : field === "min_gpa"
                    ? minGpaRef.current
                    : null;
    if (el) {
      window.requestAnimationFrame(() => {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } else {
      window.requestAnimationFrame(() => {
        callFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const setCallFormError = (field: keyof typeof callForm, message: string) => {
    setCallErrors(prev => ({ ...prev, [field]: message }));
    focusCallField(field);
  };

  const scrollToStatus = () => {
    window.requestAnimationFrame(() => {
      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    if (!token || !user) return;
    const timer = setTimeout(() => {
      void refreshData(token, user);
    }, 0);
    return () => clearTimeout(timer);
  }, [token, user]);

  const resetCallForm = () => {
    setCallForm({
      title: "",
      country: "",
      description: "",
      deadline: "",
      link: "",
      erasmus_email: "",
      min_gpa: "",
      required_docs: DOCUMENT_KEYS,
    });
    setCountryQuery("");
    setIsCountryOpen(false);
    setEditingId(null);
  };

  const submitCall = async () => {
    if (!token) return;
    setStatus(null);
    setCallErrors({});
    if (!callForm.title.trim()) {
      setStatus("Please enter a title.");
      setCallFormError("title", "Title is required.");
      return;
    }
    if (!callForm.country) {
      setStatus("Please select a country.");
      setCallFormError("country", "Country is required.");
      return;
    }
    if (!callForm.description.trim()) {
      setStatus("Please enter a description.");
      setCallFormError("description", "Description is required.");
      return;
    }
    if (!callForm.deadline.trim()) {
      setStatus("Please select a deadline.");
      setCallFormError("deadline", "Deadline is required.");
      return;
    }
    if (!callForm.link.trim()) {
      setStatus("Please enter a link.");
      setCallFormError("link", "Link is required.");
      return;
    }
    try {
      const parsedLink = new URL(callForm.link.trim());
      if (!["http:", "https:"].includes(parsedLink.protocol)) {
        setStatus("Link must start with http:// or https://");
        setCallFormError("link", "Use a valid http:// or https:// link.");
        return;
      }
    } catch {
      setStatus("Please enter a valid link.");
      setCallFormError("link", "Enter a valid URL.");
      return;
    }
    if (!callForm.erasmus_email.trim()) {
      setStatus("Please enter the Erasmus contact email.");
      setCallFormError("erasmus_email", "Contact email is required.");
      return;
    }
    const minGpaValue = callForm.min_gpa.trim();
    if (minGpaValue && !/^\d+(\.\d+)?$/.test(minGpaValue)) {
      setStatus("Minimum GPA must be a number between 0 and 10.");
      setCallFormError("min_gpa", "Enter a number between 0 and 10.");
      return;
    }
    const minGpa = minGpaValue ? Number(minGpaValue) : 0;
    if (Number.isNaN(minGpa) || minGpa < 0 || minGpa > 10) {
      setStatus("Minimum GPA must be between 0 and 10.");
      setCallFormError("min_gpa", "Enter a number between 0 and 10.");
      return;
    }
    if (callForm.required_docs.length === 0) {
      setStatus("Select at least one required document.");
      window.requestAnimationFrame(() => {
        callFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    const payload = {
      ...callForm,
      title: callForm.title.trim(),
      description: callForm.description.trim(),
      deadline: callForm.deadline.trim(),
      link: callForm.link.trim(),
      erasmus_email: callForm.erasmus_email.trim(),
      min_gpa: minGpa,
      required_docs: callForm.required_docs,
    };
    try {
      if (editingId) {
        await apiRequest<ErasmusCall>(
          `/calls/${editingId}`,
          { method: "PUT", body: JSON.stringify(payload) },
          token
        );
      } else {
        await apiRequest<ErasmusCall>(
          "/calls",
          { method: "POST", body: JSON.stringify(payload) },
          token
        );
      }
      resetCallForm();
      if (user) {
        await refreshData(token, user);
      }
      setStatus("Saved.");
      scrollToStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
      scrollToStatus();
    }
  };

  const editCall = (call: ErasmusCall) => {
    const resolved = findCountryOption(call.country, countryMap);
    const normalizedDocs =
      call.required_docs && call.required_docs.length > 0
        ? call.required_docs
        : DOCUMENT_KEYS;
    setCallForm({
      title: call.title,
      country: resolved?.code ?? call.country,
      description: call.description,
      deadline: call.deadline,
      link: call.link,
      erasmus_email: call.erasmus_email ?? "",
      min_gpa: call.min_gpa ? String(call.min_gpa) : "",
      required_docs: normalizedDocs as DocumentKey[],
    });
    setCountryQuery(resolved?.name ?? call.country);
    setEditingId(call.id);
  };

  const deleteCall = async (callId: number) => {
    if (!token || !user) return;
    if (deletingId === callId) return;
    setStatus(null);
    setDeletingId(callId);
    setCalls(prev => prev.filter(call => call.id !== callId));
    if (editingId === callId) {
      resetCallForm();
    }
    try {
      await apiRequest<void>(`/calls/${callId}`, { method: "DELETE" }, token);
      await refreshData(token, user);
      setStatus("Deleted.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      if (!message.toLowerCase().includes("call not found")) {
        setStatus(message);
      } else {
        setStatus("Deleted.");
      }
      await refreshData(token, user);
    } finally {
      setDeletingId(null);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    if (!token || !user) return;
    if (deletingNotificationId === notificationId) return;
    setStatus(null);
    setDeletingNotificationId(notificationId);
    setNotifications(prev => prev.filter(item => item.id !== notificationId));
    try {
      await apiRequest<void>(
        `/notifications/${notificationId}`,
        { method: "DELETE" },
        token
      );
      await refreshData(token, user);
      setStatus("Notification deleted.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      if (!message.toLowerCase().includes("notification not found")) {
        setStatus(message);
      } else {
        setStatus("Notification deleted.");
      }
      await refreshData(token, user);
    } finally {
      setDeletingNotificationId(null);
    }
  };

  const reviewApplication = async (
    application: Application,
    nextStatus: "approved" | "rejected"
  ) => {
    if (!token || !user) return;
    setStatus(null);
    const reason = (reviewNotes[application.id] || "").trim();
    if (nextStatus === "rejected" && !reason) {
      setReviewErrors(prev => ({
        ...prev,
        [application.id]: "Rejection reason is required.",
      }));
      setStatus("Rejection reason is required.");
      scrollToStatus();
      return;
    }
    setReviewingId(application.id);
    try {
      const payload =
        nextStatus === "rejected" ? { status: nextStatus, reason } : { status: nextStatus };
      const updated = await apiRequest<Application>(
        `/applications/${application.id}/review`,
        { method: "POST", body: JSON.stringify(payload) },
        token
      );
      setApplications(prev =>
        prev.map(item => (item.id === updated.id ? updated : item))
      );
      setReviewNotes(prev => {
        const next = { ...prev };
        delete next[application.id];
        return next;
      });
      setReviewErrors(prev => {
        const next = { ...prev };
        delete next[application.id];
        return next;
      });
      await refreshData(token, user);
      setStatus(`Application ${updated.status}.`);
      scrollToStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
      scrollToStatus();
    } finally {
      setReviewingId(null);
    }
  };

  const downloadZip = async (applicationId: number) => {
    if (!token) return;
    setStatus(null);
    try {
      const res = await fetch(`${API_URL}/applications/${applicationId}/documents.zip`, {
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
      link.download = `application_${applicationId}_documents.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed";
      setStatus(message);
    }
  };

  const exportCsv = async () => {
    if (!token || exporting) return;
    setStatus(null);
    setExporting(true);
    try {
      const res = await fetch(`${API_URL}/applications/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Export failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "applications.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("CSV exported.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      setStatus(message);
    } finally {
      setExporting(false);
    }
  };

  const exportXlsx = async () => {
    if (!token || exportingXlsx) return;
    setStatus(null);
    setExportingXlsx(true);
    try {
      const res = await fetch(`${API_URL}/applications/export/xlsx`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Export failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "applications.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Excel exported.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      setStatus(message);
    } finally {
      setExportingXlsx(false);
    }
  };

  const exportPdf = async () => {
    if (!token || exportingPdf) return;
    setStatus(null);
    setExportingPdf(true);
    try {
      const res = await fetch(`${API_URL}/applications/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Export failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "applications.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("PDF exported.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      setStatus(message);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container">
{!user && (
          <section className="alert warning section">
            <p>You need to log in as admin.</p>
            <Link className="button primary" href="/login">
              Go to login
            </Link>
          </section>
        )}

        {user && user.role !== "admin" && (
          <section className="alert section">
            <p>You are not authorized to access the admin panel.</p>
            <Link className="button primary" href="/calls">
              Back to calls
            </Link>
          </section>
        )}

        {status && (
          <div ref={statusRef} className="alert error section" role="status" aria-live="polite">
            {status}
          </div>
        )}

        {user?.role === "admin" && (
          <div className="dashboard-shell">
            <aside className="dashboard-sidebar">
              <div className="dashboard-sidebar-card">
                <p className="dashboard-sidebar-title">Admin portal</p>
                <nav className="dashboard-nav">
                  <a className="dashboard-nav-link" href="#overview">
                    Overview <small>{activeCalls} calls</small>
                  </a>
                  <a className="dashboard-nav-link" href="#new-call">
                    New call <small>publish</small>
                  </a>
                  <a className="dashboard-nav-link" href="#current-calls">
                    Current calls <small>{calls.length}</small>
                  </a>
                  <a className="dashboard-nav-link" href="#notifications">
                    Notifications <small>{unreadNotifications}</small>
                  </a>
                  <a className="dashboard-nav-link" href="#applications">
                    Applications <small>{pendingApplications} pending</small>
                  </a>
                  <a className="dashboard-nav-link" href="#audit-log">
                    Audit log <small>{auditLogs.length}</small>
                  </a>
                </nav>
              </div>
              <div className="dashboard-sidebar-card">
                <p className="dashboard-sidebar-title">At a glance</p>
                <div className="dashboard-kpi">
                  <div className="dashboard-kpi-item">
                    <span className="dashboard-kpi-value">{pendingApplications}</span>
                    <span className="dashboard-kpi-label">pending applications</span>
                  </div>
                  <div className="dashboard-kpi-item">
                    <span className="dashboard-kpi-value">{unreadNotifications}</span>
                    <span className="dashboard-kpi-label">notifications</span>
                  </div>
                  <div className="dashboard-kpi-item">
                    <span className="dashboard-kpi-value">{exportReady}</span>
                    <span className="dashboard-kpi-label">records ready to export</span>
                  </div>
                </div>
              </div>
            </aside>

            <div className="dashboard-main">
              <section className="page-hero" id="overview">
                <div className="hero-panel hero">
                  <span className="eyebrow">Admin control room</span>
                  <h1 className="headline">A cleaner dashboard for publishing and review.</h1>
                  <p className="subhead">
                    Manage calls, notifications, decisions, exports, and the full review
                    trail from one refined workspace.
                  </p>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value">{activeCalls}</span>
                    <span className="stat-label">active calls</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{pendingApplications}</span>
                    <span className="stat-label">pending applications</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{unreadNotifications}</span>
                    <span className="stat-label">notifications</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{exportReady}</span>
                    <span className="stat-label">records ready to export</span>
                  </div>
                </div>
              </section>

              <div className="portal-bar" role="tablist" aria-label="Admin section navigation">
                <button
                  id="admin-tab-overview"
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
                  id="admin-tab-new-call"
                  role="tab"
                  aria-selected={activeSection === "new-call"}
                  aria-controls="new-call"
                  className={`portal-tab${activeSection === "new-call" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("new-call")}
                >
                  New call
                </button>
                <button
                  id="admin-tab-current-calls"
                  role="tab"
                  aria-selected={activeSection === "current-calls"}
                  aria-controls="current-calls"
                  className={`portal-tab${activeSection === "current-calls" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("current-calls")}
                >
                  Calls <small>{calls.length}</small>
                </button>
                <button
                  id="admin-tab-notifications"
                  role="tab"
                  aria-selected={activeSection === "notifications"}
                  aria-controls="notifications"
                  className={`portal-tab${activeSection === "notifications" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("notifications")}
                >
                  Notifications <small>{unreadNotifications}</small>
                </button>
                <button
                  id="admin-tab-applications"
                  role="tab"
                  aria-selected={activeSection === "applications"}
                  aria-controls="applications"
                  className={`portal-tab${activeSection === "applications" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("applications")}
                >
                  Applications <small>{pendingApplications}</small>
                </button>
                <button
                  id="admin-tab-audit-log"
                  role="tab"
                  aria-selected={activeSection === "audit-log"}
                  aria-controls="audit-log"
                  className={`portal-tab${activeSection === "audit-log" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection("audit-log")}
                >
                  Audit log
                </button>
              </div>

              {activeSection === "new-call" && (
              <section className="panel section" ref={callFormRef} id="new-call">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">{editingId ? "Edit call" : "New call"}</h2>
                    <p className="panel-note">Keep the form structured and mandatory.</p>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    placeholder="Title"
                    value={callForm.title}
                    onChange={e => setCallForm({ ...callForm, title: e.target.value })}
                    ref={titleRef}
                    required
                    style={{ padding: 10 }}
                  />
                  {callErrors.title && <div className="field-error">{callErrors.title}</div>}
                  <div
                    className="country-picker"
                    onFocus={() => setIsCountryOpen(true)}
                    onBlur={handleCountryBlur}
                  >
                    <input
                      placeholder="Search country"
                      value={countryQuery}
                      onChange={e => {
                        const nextValue = e.target.value;
                        setCountryQuery(nextValue);
                        setCallForm({ ...callForm, country: "" });
                      }}
                      ref={countryRef}
                      className="country-select"
                      style={{ padding: 10 }}
                    />
                    {callErrors.country && <div className="field-error">{callErrors.country}</div>}
                    {isCountryOpen && (
                      <div className="country-list" role="listbox">
                        {countryQuery.trim() !== "" && filteredCountries.length === 0 && (
                          <div className="country-empty">No matches.</div>
                        )}
                        {filteredCountries.map(option => {
                          const isActive = selectedCountry?.code === option.code;
                          return (
                            <button
                              key={option.code}
                              type="button"
                              className={`country-option${isActive ? " active" : ""}`}
                              onClick={() => {
                                setCallForm({ ...callForm, country: option.code });
                                setCountryQuery(option.name);
                                setIsCountryOpen(false);
                              }}
                            >
                              <Image
                                className="country-flag-image"
                                src={flagImageUrl(option.code)}
                                alt={`${option.name} flag`}
                                width={24}
                                height={18}
                              />
                              <span className="country-flag">{option.flag}</span>
                              <span>{option.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <input
                    type="date"
                    value={callForm.deadline}
                    onChange={e => setCallForm({ ...callForm, deadline: e.target.value })}
                    ref={deadlineRef}
                    required
                    style={{ padding: 10 }}
                  />
                  {callErrors.deadline && <div className="field-error">{callErrors.deadline}</div>}
                  <input
                    placeholder="Link"
                    value={callForm.link}
                    onChange={e => setCallForm({ ...callForm, link: e.target.value })}
                    ref={linkRef}
                    type="url"
                    required
                    style={{ padding: 10 }}
                  />
                  {callErrors.link && <div className="field-error">{callErrors.link}</div>}
                  <input
                    placeholder="Erasmus contact email"
                    type="email"
                    value={callForm.erasmus_email}
                    onChange={e =>
                      setCallForm({ ...callForm, erasmus_email: e.target.value })
                    }
                    ref={emailRef}
                    required
                    style={{ padding: 10 }}
                  />
                  {callErrors.erasmus_email && (
                    <div className="field-error">{callErrors.erasmus_email}</div>
                  )}
                  <input
                    placeholder="Minimum GPA (optional)"
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    inputMode="decimal"
                    value={callForm.min_gpa}
                    onChange={e => setCallForm({ ...callForm, min_gpa: e.target.value })}
                    ref={minGpaRef}
                    style={{ padding: 10 }}
                  />
                  {callErrors.min_gpa && <div className="field-error">{callErrors.min_gpa}</div>}
                  <div style={{ display: "grid", gap: 8 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Required documents
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {DOCUMENT_TYPES.map(doc => (
                        <label
                          key={doc.key}
                          style={{ display: "flex", gap: 8, alignItems: "center" }}
                        >
                          <input
                            type="checkbox"
                            checked={callForm.required_docs.includes(doc.key)}
                            onChange={() => {
                              setCallForm(prev => {
                                const next = prev.required_docs.includes(doc.key)
                                  ? prev.required_docs.filter(item => item !== doc.key)
                                  : [...prev.required_docs, doc.key];
                                return { ...prev, required_docs: next };
                              });
                            }}
                          />
                          <span>{doc.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <textarea
                    placeholder="Description"
                    value={callForm.description}
                    onChange={e => setCallForm({ ...callForm, description: e.target.value })}
                    ref={descriptionRef}
                    required
                    style={{ padding: 10, minHeight: 100 }}
                  />
                  {callErrors.description && (
                    <div className="field-error">{callErrors.description}</div>
                  )}
                </div>
                <div className="form-actions" style={{ marginTop: 12 }}>
                  <button className="button primary" onClick={submitCall}>
                    {editingId ? "Save changes" : "Publish call"}
                  </button>
                  {editingId && (
                    <button className="button" onClick={resetCallForm}>
                      Cancel
                    </button>
                  )}
                </div>
              </section>
              )}

              {activeSection === "current-calls" && (
              <section className="section" id="current-calls">
                <div className="section-heading">
                  <div>
                    <h2 className="section-title">Current calls</h2>
                    <p className="section-description">
                      Published calls ready for review or editing.
                    </p>
                  </div>
                </div>
                {calls.length === 0 ? (
                  <div className="empty-state">No calls yet.</div>
                ) : (
                  <div className="grid">
                    {calls.map(call => (
                      <div key={call.id} className="card">
                        <div className="toolbar" style={{ alignItems: "start" }}>
                          <div>
                            <strong>{call.title}</strong>
                            <div className="meta">{formatCountry(call.country, countryMap)}</div>
                          </div>
                          <span className="status-pill pending">Open</span>
                        </div>
                        <div className="meta" style={{ marginTop: 6 }}>
                          Deadline: {call.deadline}
                        </div>
                        {call.erasmus_email && (
                          <div className="meta" style={{ marginTop: 4 }}>
                            Erasmus: {call.erasmus_email}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <Link className="button" href={`/details?id=${call.id}`}>
                            Details
                          </Link>
                          <button className="button" onClick={() => editCall(call)}>
                            Edit
                          </button>
                          <button
                            className="button"
                            onClick={() => deleteCall(call.id)}
                            disabled={deletingId === call.id}
                          >
                            {deletingId === call.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              )}

              {activeSection === "notifications" && (
              <section className="section" id="notifications">
                <div className="section-heading">
                  <div>
                    <h2 className="section-title">Notifications</h2>
                    <p className="section-description">
                      Messages triggered by student and admin activity.
                    </p>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="empty-state">No notifications yet.</div>
                ) : (
                  <div className="grid">
                    {notifications.map(item => (
                      <div key={item.id} className="card">
                        <strong>{item.title}</strong>
                        <div className="meta">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                        <div>{item.body}</div>
                        <div style={{ marginTop: 12 }}>
                          <button
                            className="button"
                            onClick={() => deleteNotification(item.id)}
                            disabled={deletingNotificationId === item.id}
                          >
                            {deletingNotificationId === item.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              )}

              {activeSection === "applications" && (
              <section className="section" id="applications">
                <div className="section-heading">
                  <div>
                    <h2 className="section-title">Applications</h2>
                    <p className="section-description">
                      Search, review, and export submissions.
                    </p>
                  </div>
                  <div className="filters">
                    <input
                      placeholder="Search by name, email, or call"
                      value={searchQuery}
                      onChange={event => setSearchQuery(event.target.value)}
                      style={{ minWidth: 240 }}
                    />
                    <select
                      value={statusFilter}
                      onChange={event =>
                        setStatusFilter(
                          event.target.value as
                            | "all"
                            | "pending"
                            | "approved"
                            | "rejected"
                            | "withdrawn"
                        )
                      }
                      style={{ minWidth: 160 }}
                    >
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    <button
                      className="button"
                      onClick={exportCsv}
                      disabled={exporting}
                    >
                      {exporting ? "Exporting..." : "Export CSV"}
                    </button>
                    <button
                      className="button"
                      onClick={exportXlsx}
                      disabled={exportingXlsx}
                    >
                      {exportingXlsx ? "Exporting..." : "Export Excel"}
                    </button>
                    <button
                      className="button"
                      onClick={exportPdf}
                      disabled={exportingPdf}
                    >
                      {exportingPdf ? "Exporting..." : "Export PDF"}
                    </button>
                  </div>
                </div>
                {filteredApplications.length === 0 ? (
                  <div className="empty-state">No applications match the current filters.</div>
                ) : (
                  <div className="grid">
                    {filteredApplications.map(item => (
                      <div key={item.id} className="card">
                        <div className="toolbar" style={{ alignItems: "start" }}>
                          <div>
                            <strong>{item.call_title}</strong>
                            <div className="meta">Student: {item.user_email}</div>
                          </div>
                          <span className={`status-pill ${item.status}`}>{item.status}</span>
                        </div>
                        <div>Name: {item.full_name}</div>
                        <div>Department: {item.department}</div>
                        <div>Phone: {item.phone}</div>
                        {item.notes && <div>Notes: {item.notes}</div>}
                        <div className="muted" style={{ fontSize: 12 }}>
                          Submitted: {new Date(item.created_at).toLocaleString()}
                        </div>
                        {item.reviewed_at && (
                          <div className="meta">
                            Reviewed: {new Date(item.reviewed_at).toLocaleString()}
                          </div>
                        )}
                        {item.reviewed_by_email && (
                          <div className="meta">
                            Updated by: {item.reviewed_by_email}
                          </div>
                        )}
                        {item.decision_reason && (
                          <div>
                            <strong>Decision reason:</strong> {item.decision_reason}
                          </div>
                        )}
                        {item.status === "pending" && (
                          <>
                            <textarea
                              placeholder="Rejection reason (required for reject)"
                              value={reviewNotes[item.id] ?? ""}
                              onChange={event => {
                                const value = event.target.value;
                                setReviewNotes(prev => ({ ...prev, [item.id]: value }));
                                setReviewErrors(prev => {
                                  const next = { ...prev };
                                  delete next[item.id];
                                  return next;
                                });
                              }}
                              style={{ marginTop: 8, padding: 10, minHeight: 80 }}
                            />
                            {reviewErrors[item.id] && (
                              <div className="field-error">{reviewErrors[item.id]}</div>
                            )}
                            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                              <button
                                className="button primary"
                                onClick={() => reviewApplication(item, "approved")}
                                disabled={reviewingId === item.id}
                              >
                                {reviewingId === item.id ? "Saving..." : "Approve"}
                              </button>
                              <button
                                className="button"
                                onClick={() => reviewApplication(item, "rejected")}
                                disabled={reviewingId === item.id}
                              >
                                {reviewingId === item.id ? "Saving..." : "Reject"}
                              </button>
                            </div>
                          </>
                        )}
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <Link className="button primary" href={`/applications/${item.id}`}>
                            View application
                          </Link>
                          <Link className="button" href={`/details?id=${item.call_id}`}>
                            Call details
                          </Link>
                          <button
                            className="button"
                            onClick={() => downloadZip(item.id)}
                          >
                            Download ZIP
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              )}

              {activeSection === "audit-log" && (
              <section className="section" id="audit-log">
                <div className="section-heading">
                  <div>
                    <h2 className="section-title">Audit log</h2>
                    <p className="section-description">A clean history of review actions.</p>
                  </div>
                </div>
                {auditLogs.length === 0 ? (
                  <div className="empty-state">No audit entries yet.</div>
                ) : (
                  <div className="grid">
                    {auditLogs.map(log => (
                      <div key={log.id} className="card">
                        <strong>{log.call_title}</strong>
                        <div className="meta">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        {log.application_id && <div>Application ID: {log.application_id}</div>}
                        <div>Student: {log.student_email}</div>
                        <div>Status: {log.status}</div>
                        <div>Reviewed by: {log.reviewer_email}</div>
                        {log.reason && <div>Reason: {log.reason}</div>}
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

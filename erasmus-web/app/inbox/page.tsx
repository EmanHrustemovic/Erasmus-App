"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import type { InboxMessage } from "../lib/types";

type InboxCta = {
  label: string;
  href: string;
};

const CTA_LABEL_PATTERN = /^(Open|Review|View)\b/i;

const parseInboxBody = (body: string) => {
  const lines = body.split(/\r?\n/);
  const ctas: InboxCta[] = [];
  const remaining: string[] = [];
  for (const line of lines) {
    const match = line.trim().match(/^([^:]+):\s*(https?:\/\/\S+)$/);
    if (match) {
      const label = match[1].trim();
      const href = match[2].trim();
      if (CTA_LABEL_PATTERN.test(label)) {
        ctas.push({ label, href });
        continue;
      }
    }
    remaining.push(line);
  }
  return { text: remaining.join("\n").trim(), ctas };
};

export default function InboxPage() {
  const { token, user, logout } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const unreadCount = messages.filter(item => !item.read_at).length;
  const readCount = messages.length - unreadCount;

  const loadMessages = async (activeToken: string) => {
    try {
      const data = await apiRequest<InboxMessage[]>("/inbox", {}, activeToken);
      setMessages(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    }
  };

  useEffect(() => {
    if (!token || !user) return;
    const timer = setTimeout(() => {
      void loadMessages(token);
    }, 0);
    return () => clearTimeout(timer);
  }, [token, user]);

  const markMessageRead = async (messageId: number) => {
    if (!token) return;
    try {
      const updated = await apiRequest<InboxMessage>(
        `/inbox/${messageId}/read`,
        { method: "POST" },
        token
      );
      setMessages(prev =>
        prev.map(item => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!token) return;
    setDeletingId(messageId);
    try {
      await apiRequest<void>(`/inbox/${messageId}`, { method: "DELETE" }, token);
      setMessages(prev => prev.filter(item => item.id !== messageId));
      setSelectedIds(prev => prev.filter(id => id !== messageId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    } finally {
      setDeletingId(null);
    }
  };

  const markAllRead = async () => {
    if (!token || markingAll) return;
    setMarkingAll(true);
    try {
      await apiRequest<{ count: number }>(
        "/inbox/mark-all-read",
        { method: "POST" },
        token
      );
      await loadMessages(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteSelected = async () => {
    if (!token || bulkDeleting || selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      await apiRequest<{ count: number }>(
        "/inbox/bulk-delete",
        { method: "POST", body: JSON.stringify({ ids: selectedIds }) },
        token
      );
      setSelectedIds([]);
      await loadMessages(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setStatus(message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const filteredMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return messages.filter(item => {
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" ? Boolean(item.read_at) : !item.read_at);
      if (!matchesRead) return false;
      if (!query) return true;
      const haystack = `${item.subject} ${item.body}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [messages, readFilter, searchQuery]);

  const allSelected =
    filteredMessages.length > 0 &&
    filteredMessages.every(item => selectedIds.includes(item.id));

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container">
        <section className="page-hero">
          <div className="hero-panel hero">
            <span className="eyebrow">Inbox</span>
            <h1 className="headline">A more premium inbox for portal updates.</h1>
            <p className="subhead">
              Read notifications, filter by status, and keep Erasmus communication tidy.
            </p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{messages.length}</span>
              <span className="stat-label">total messages</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{unreadCount}</span>
              <span className="stat-label">unread messages</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{readCount}</span>
              <span className="stat-label">read messages</span>
            </div>
          </div>
        </section>

        {!user && (
          <section className="alert warning section">
            <p>You need to log in to view the inbox.</p>
            <Link className="button primary" href="/login">
              Go to login
            </Link>
          </section>
        )}

        {status && (
          <div className="alert error section">
            {status}
          </div>
        )}

        {user && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Messages</h2>
                <p className="panel-note">Search, filter, and manage inbox content.</p>
              </div>
            </div>
            {messages.length === 0 ? (
              <div className="empty-state">No messages yet.</div>
            ) : (
              <>
                <div className="toolbar section">
                  <input
                    placeholder="Search inbox"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    style={{ maxWidth: 280 }}
                  />
                  <select
                    value={readFilter}
                    onChange={event =>
                      setReadFilter(event.target.value as "all" | "read" | "unread")
                    }
                    style={{ maxWidth: 160 }}
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <button className="button" onClick={markAllRead} disabled={markingAll}>
                    {markingAll ? "Marking..." : "Mark all read"}
                  </button>
                  <button
                    className="button danger"
                    onClick={deleteSelected}
                    disabled={bulkDeleting || selectedIds.length === 0}
                  >
                    {bulkDeleting ? "Deleting..." : "Delete selected"}
                  </button>
                  <button
                    className="button"
                    onClick={() =>
                      setSelectedIds(
                        allSelected ? [] : filteredMessages.map(item => item.id)
                      )
                    }
                    disabled={filteredMessages.length === 0}
                  >
                    {allSelected ? "Clear selection" : "Select all"}
                  </button>
                </div>
                {filteredMessages.length === 0 ? (
                  <div className="empty-state">No messages match your filters.</div>
                ) : (
                  <div className="detail-list">
                    {filteredMessages.map(item => {
                      const { text, ctas } = parseInboxBody(item.body);
                      const isUnread = !item.read_at;
                      return (
                        <div
                          key={item.id}
                          className={`card${isUnread ? " unread" : ""}`}
                          onClick={() => {
                            if (isUnread) {
                              void markMessageRead(item.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={event => {
                            if (event.key === "Enter" && isUnread) {
                              void markMessageRead(item.id);
                            }
                          }}
                        >
                          <div className="toolbar" style={{ alignItems: "start" }}>
                            <div className="chip-row">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => {
                                  setSelectedIds(prev =>
                                    prev.includes(item.id)
                                      ? prev.filter(id => id !== item.id)
                                      : [...prev, item.id]
                                  );
                                }}
                                onClick={event => event.stopPropagation()}
                                onKeyDown={event => event.stopPropagation()}
                              />
                              <strong>{item.subject}</strong>
                              <span className={`status-pill ${isUnread ? "unread" : "read"}`}>
                                {isUnread ? "Unread" : "Read"}
                              </span>
                            </div>
                            <button
                              className="button danger"
                              onClick={event => {
                                event.stopPropagation();
                                void deleteMessage(item.id);
                              }}
                              onKeyDown={event => event.stopPropagation()}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                          <div className="meta">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                          {text && <div style={{ whiteSpace: "pre-line" }}>{text}</div>}
                          {ctas.length > 0 && (
                            <div className="link-row" style={{ marginTop: 10 }}>
                              {ctas.map(cta => (
                                <a key={`${cta.label}-${cta.href}`} className="button" href={cta.href}>
                                  {cta.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}

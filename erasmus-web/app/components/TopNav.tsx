"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiRequest } from "../lib/api";
import type { User } from "../lib/types";

type Props = {
  user?: User | null;
  token?: string | null;
  onLogout?: () => void;
};

export default function TopNav({ user, token, onLogout }: Props) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/calls", label: "Calls" },
    user?.role === "student" ? { href: "/student", label: "Dashboard" } : null,
    user?.role === "admin" ? { href: "/admin", label: "Admin" } : null,
    user ? { href: "/inbox", label: "Inbox" } : null,
    user ? { href: "/security", label: "Security" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  useEffect(() => {
    if (!token || !user) {
      return;
    }
    let cancelled = false;
    const loadCount = async () => {
      try {
        const data = await apiRequest<{ count: number }>(
          "/inbox/unread-count",
          {},
          token
        );
        if (!cancelled) {
          setUnreadCount(data.count);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };
    void loadCount();
    const interval = window.setInterval(loadCount, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [token, user]);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            E
          </span>
          <span>
            Erasmus Portal
            <span className="nav-email" style={{ display: "block", marginTop: 2 }}>
              Official mobility workspace
            </span>
          </span>
        </Link>
        <nav className="nav-links">
          {navItems.map(item => (
            <Link
              key={item.href}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          {!user && (
            <Link className="nav-link" href="/login">
              Login
            </Link>
          )}
        </nav>
        {user && (
          <div className="nav-user">
            <Link className="icon-button" href="/inbox" aria-label="Inbox">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6zm2 0v10h14V6H5zm2 2h10v2H7V8zm0 4h6v2H7v-2z" />
              </svg>
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </Link>
            <div className="nav-user-card">
              <div>
                <div className="nav-email">{user.email}</div>
                <div className="nav-role">{user.role}</div>
              </div>
            </div>
            <button className="button subtle" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

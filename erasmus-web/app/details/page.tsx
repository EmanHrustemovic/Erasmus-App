"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TopNav from "../components/TopNav";
import { apiRequest } from "../lib/api";
import { buildCountryOptions, createCountryMap, formatCountry } from "../lib/countries";
import { useAuth } from "../lib/useAuth";
import type { ErasmusCall } from "../lib/types";

function DetailsContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const { token, user, logout } = useAuth();

  const [data, setData] = useState<ErasmusCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const countryOptions = useMemo(() => buildCountryOptions(), []);
  const countryMap = useMemo(() => createCountryMap(countryOptions), [countryOptions]);

  useEffect(() => {
    if (!token || !id) return;
    apiRequest<ErasmusCall>(`/calls/${id}`, {}, token)
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [token, id]);

  return (
    <>
      <TopNav user={user} token={token} onLogout={logout} />
      <main className="container">
        <section className="page-hero">
          <div className="hero-panel hero">
            <span className="eyebrow">Call details</span>
            <h1 className="headline">Review the full call before applying.</h1>
            <p className="subhead">
              Check country, deadline, and official contact details in one view.
            </p>
          </div>
        </section>

        {!user && (
          <section className="alert warning section">
            <p>You need to log in to view this call.</p>
            <Link className="button primary" href="/login">
              Go to login
            </Link>
          </section>
        )}

        {error && (
          <section className="alert error section">
            {error}
          </section>
        )}

        {data && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">{data.title}</h2>
                <p className="panel-note">{formatCountry(data.country, countryMap)}</p>
              </div>
              <span className="status-pill pending">Open</span>
            </div>
            <div className="chip-row section">
              <span className="chip neutral">Deadline {data.deadline}</span>
              {data.erasmus_email && <span className="chip">Contact {data.erasmus_email}</span>}
              {typeof data.min_gpa === "number" && data.min_gpa > 0 && (
                <span className="chip warning">Min GPA {data.min_gpa}</span>
              )}
            </div>
            <p>{data.description}</p>
            <div className="link-row section">
              <a className="button primary" href={data.link} target="_blank" rel="noreferrer">
                Official link
              </a>
              {user?.role === "student" && (
                <Link className="button" href="/student">
                  Open student dashboard
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

export default function Details() {
  return (
    <Suspense
      fallback={<div className="container section">Loading call details...</div>}
    >
      <DetailsContent />
    </Suspense>
  );
}
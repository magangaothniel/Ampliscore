"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Data = {
  stats: Record<string, any>;
  openErrors: any[];
  openReports: any[];
  support: any[];
  recentUsers: any[];
};

export default function AdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function token() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function load() {
    setLoading(true);
    const t = await token();
    if (!t) { setDenied(true); setLoading(false); return; }

    const res = await fetch("/api/admin", { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 403) { setDenied(true); setLoading(false); return; }
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function act(action: string, id: string, extra: Record<string, any> = {}) {
    setBusy(id);
    const t = await token();
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ action, id, ...extra }),
    });
    setBusy(null);
    load();
  }

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-16 text-ink-600">Loading…</div>;
  if (denied) return <div className="max-w-5xl mx-auto px-4 py-16 text-ink-600">Not authorised.</div>;
  if (!data) return null;

  const d = data;
  const s = d.stats;
  const needsAction = d.support.length + d.openReports.length + d.openErrors.length;

  // Jump to whichever list actually has something in it, most urgent first.
  function jumpToAction() {
    const target =
      d.support.length > 0 ? "sec-support"
      : d.openReports.length > 0 ? "sec-reports"
      : d.openErrors.length > 0 ? "sec-errors"
      : null;
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-ink-900">Admin</h1>
        <button onClick={load} className="text-sm text-purple-600 hover:underline">Refresh</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <Stat label="Users" value={s.users} sub={`${s.newUsers} new this week`} />
        <Stat label="Pro" value={s.pro} sub={`$${s.mrr} MRR`} accent />
        <Stat label="Waitlist" value={s.waitlist} />
        <Stat label="Beta testers" value={s.betaTesters} />
        <Stat label="Courses" value={s.courses} />
        <Stat label="Assignments" value={s.assignments} />
        <Stat label="Ratings" value={s.ratings} />
        <Stat
          label="Needs action"
          value={needsAction}
          alert={needsAction > 0}
          onClick={needsAction > 0 ? jumpToAction : undefined}
          sub={needsAction > 0 ? "Tap to jump" : "All clear"}
        />
      </div>

      <Section id="sec-support" title={`Support requests (${d.support.length})`}>
        {d.support.length === 0 ? (
          <Empty>Nothing waiting.</Empty>
        ) : (
          d.support.map((r) => (
            <Row key={r.id}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {r.concerning && (
                    <span className="text-[11px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      Check in
                    </span>
                  )}
                  <span className="text-xs text-ink-400">
                    {r.type} · {r.platform || "unknown"}{r.app_version ? ` · v${r.app_version}` : ""} ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-ink-900 mt-1 whitespace-pre-wrap">{r.message}</p>
                <p className="text-xs text-ink-400 mt-1">{r.email}</p>
              </div>
              <Action busy={busy === r.id} onClick={() => act("resolve_support", r.id)}>
                Resolve
              </Action>
            </Row>
          ))
        )}
      </Section>

      <Section id="sec-reports" title={`Rating reports (${d.openReports.length})`}>
        {d.openReports.length === 0 ? (
          <Empty>No open reports.</Empty>
        ) : (
          d.openReports.map((r) => (
            <Row key={r.id}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wide bg-red-50 text-bad px-2 py-0.5 rounded">
                    {r.reason}
                  </span>
                  {r.rating?.hidden && (
                    <span className="text-[11px] text-ink-400">already hidden</span>
                  )}
                </div>
                {r.details && <p className="text-sm text-ink-600 mt-2">{r.details}</p>}

                {r.rating ? (
                  <div className="mt-3 rounded-xl bg-purple-50/60 border border-purple-100 p-3">
                    <p className="text-xs text-ink-400">
                      {r.rating.professor_name}
                      {r.rating.university ? ` · ${r.rating.university}` : ""}
                      {r.rating.course_code ? ` · ${r.rating.course_code}` : ""}
                    </p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {r.rating.rating}/5 · difficulty {r.rating.difficulty}/5
                    </p>
                    {r.rating.review && (
                      <p className="text-sm text-ink-900 mt-2 whitespace-pre-wrap">{r.rating.review}</p>
                    )}
                    {r.rating.success_tips && (
                      <p className="text-sm text-ink-600 mt-2 whitespace-pre-wrap">
                        <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Tips </span>
                        {r.rating.success_tips}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-ink-400 mt-2">
                    Review not found. It may have been deleted already.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Action
                  busy={busy === r.id}
                  danger
                  onClick={() => act("hide_rating", r.id, { rating_id: r.rating_id })}
                >
                  Hide review
                </Action>
                <Action busy={busy === r.id} onClick={() => act("dismiss_report", r.id)}>
                  Dismiss
                </Action>
              </div>
            </Row>
          ))
        )}
      </Section>

      <Section id="sec-errors" title={`Open errors (${d.openErrors.length})`}>
        {d.openErrors.length === 0 ? (
          <Empty>Nothing broken that we know of.</Empty>
        ) : (
          d.openErrors.map((e) => (
            <Row key={e.id}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-900 break-words">{e.message}</p>
                <p className="text-xs text-ink-400 mt-1">
                  {e.where_at} · {e.source} · {e.occurrences}x · last{" "}
                  {e.last_seen_at ? new Date(e.last_seen_at).toLocaleString() : "unknown"}
                </p>
              </div>
              <Action busy={busy === e.id} onClick={() => act("resolve_error", e.id)}>
                Resolve
              </Action>
            </Row>
          ))
        )}
      </Section>

      <Section title="Newest accounts">
        {d.recentUsers.map((u) => (
          <Row key={u.id}>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-900">{u.full_name || "No name"}</p>
              <p className="text-xs text-ink-400">{new Date(u.created_at).toLocaleDateString()}</p>
            </div>
            {u.is_pro && (
              <span className="text-[11px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700 px-2 py-0.5 rounded self-center">
                Pro
              </span>
            )}
          </Row>
        ))}
      </Section>
    </div>
  );
}

function Stat({ label, value, sub, accent, alert, onClick }: any) {
  const Tag: any = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left w-full ${
        alert ? "border-amber-300 bg-amber-50" : "border-ink-200 bg-white"
      } ${onClick ? "hover:border-amber-400 cursor-pointer transition-colors" : ""}`}
    >
      <p className="text-xs text-ink-400 uppercase tracking-wide">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${accent ? "text-purple-600" : "text-ink-900"}`}>
        {value ?? "—"}
      </p>
      {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
    </Tag>
  );
}

function Section({ title, children, id }: any) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <h2 className="text-lg font-semibold text-ink-900 mb-3">{title}</h2>
      <div className="rounded-2xl border border-ink-200 bg-white divide-y divide-purple-50 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({ children }: any) {
  return <div className="flex items-start gap-4 px-5 py-4">{children}</div>;
}

function Empty({ children }: any) {
  return <p className="px-5 py-6 text-sm text-ink-400">{children}</p>;
}

function Action({ children, onClick, busy, danger }: any) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg border whitespace-nowrap disabled:opacity-50 transition-colors ${
        danger
          ? "border-red-200 text-bad hover:bg-red-50"
          : "border-ink-200 text-ink-600 hover:bg-purple-50"
      }`}
    >
      {busy ? "…" : children}
    </button>
  );
}

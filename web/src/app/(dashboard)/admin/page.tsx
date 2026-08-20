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

  const s = data.stats;

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
          value={data.support.length + data.openReports.length + data.openErrors.length}
          alert={data.support.length + data.openReports.length + data.openErrors.length > 0}
        />
      </div>

      <Section title={`Support requests (${data.support.length})`}>
        {data.support.length === 0 ? (
          <Empty>Nothing waiting.</Empty>
        ) : (
          data.support.map((r) => (
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

      <Section title={`Rating reports (${data.openReports.length})`}>
        {data.openReports.length === 0 ? (
          <Empty>No open reports.</Empty>
        ) : (
          data.openReports.map((r) => (
            <Row key={r.id}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900">{r.reason}</p>
                {r.details && <p className="text-sm text-ink-600 mt-1">{r.details}</p>}
                <p className="text-xs text-ink-400 mt-1">rating {r.rating_id}</p>
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

      <Section title={`Open errors (${data.openErrors.length})`}>
        {data.openErrors.length === 0 ? (
          <Empty>Nothing broken that we know of.</Empty>
        ) : (
          data.openErrors.map((e) => (
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
        {data.recentUsers.map((u) => (
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

function Stat({ label, value, sub, accent, alert }: any) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        alert ? "border-amber-300 bg-amber-50" : "border-ink-200 bg-white"
      }`}
    >
      <p className="text-xs text-ink-400 uppercase tracking-wide">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${accent ? "text-purple-600" : "text-ink-900"}`}>
        {value ?? "—"}
      </p>
      {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <section className="mt-10">
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

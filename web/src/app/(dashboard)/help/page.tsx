"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Faq = { q: string; a: React.ReactNode };

// Written from how the product actually behaves. Worth revisiting once real
// support requests come in, since those will show what people actually ask.
const FAQS: Faq[] = [
  {
    q: "Why doesn't my grade match what Canvas shows?",
    a: (
      <>
        Ampliscore only knows what you've entered. If your professor has graded
        something you haven't added yet, or a category weight here doesn't match
        the syllabus, the numbers will differ. Open the course and check that
        your category weights add up to 100% and that every graded assignment is
        in there.
      </>
    ),
  },
  {
    q: "How do grade categories work?",
    a: (
      <>
        Most syllabi split your grade into buckets, like homework 20%, midterms
        40%, final 40%. Add each bucket as a category with its weight, then file
        assignments under it. Within a category, we total the points you earned
        against the points possible, then weight that by the category
        percentage.
      </>
    ),
  },
  {
    q: "What counts toward the 4 course limit on the free plan?",
    a: (
      <>
        Every course you're currently tracking. Deleting a course frees a slot.
        Assignments and categories are unlimited on both plans, so the limit is
        only on how many classes you track at once.
      </>
    ),
  },
  {
    q: "How does the AI grade prediction work?",
    a: (
      <>
        It looks at your entered grades, category weights, and what's left
        ungraded, then estimates where you'll land. It's an estimate based on
        your own data, not a guarantee, and it gets more accurate the more
        you've entered. Pro accounts get 50 predictions a month.
      </>
    ),
  },
  {
    q: "Are professor ratings anonymous?",
    a: (
      <>
        Your name is never shown on a rating. We do store which account
        submitted it so we can act on reports and stop abuse. Anything that
        targets or harasses a person gets removed.
      </>
    ),
  },
  {
    q: "I found a review that shouldn't be there.",
    a: (
      <>
        Every rating has a Report option. Pick a reason, add details if you
        want, and it comes straight to us. Reviews that get taken down stop
        showing on the web and in the app.
      </>
    ),
  },
  {
    q: "How do I cancel Pro?",
    a: (
      <>
        Go to{" "}
        <Link href="/settings" className="text-purple-600 hover:underline">
          Settings
        </Link>{" "}
        and open the billing portal. You keep Pro until the end of the period
        you've already paid for, and your data stays put if you drop back to
        free, though you'll only see your first 4 courses until you're under the
        limit again.
      </>
    ),
  },
  {
    q: "When is the mobile app coming?",
    a: (
      <>
        Soon. Join the waitlist on the{" "}
        <Link href="/" className="text-purple-600 hover:underline">
          home page
        </Link>{" "}
        and you'll get an email when it's downloadable.
      </>
    ),
  },
];

const TYPES = [
  ["bug", "Something is broken"],
  ["question", "I have a question"],
  ["billing", "Billing or my plan"],
  ["other", "Something else"],
] as const;

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);
  const [type, setType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!type) {
      setError("Pick what your message is about.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Tell us a little more so we can actually help.");
      return;
    }

    setSending(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in again.");
        setSending(false);
        return;
      }

      const res = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, message, platform: "web" }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not send that. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-ink-900">Help &amp; support</h1>
      <p className="text-ink-600 mt-2">
        Common questions first. If yours isn&apos;t here, send us a message and we&apos;ll get back to you.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Frequently asked</h2>
        <div className="rounded-2xl border border-ink-200 bg-white overflow-hidden">
          {FAQS.map((f, i) => (
            <div key={f.q} className={i > 0 ? "border-t border-purple-50" : ""}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-purple-50/50 transition-colors"
              >
                <span className="text-sm font-medium text-ink-900">{f.q}</span>
                <span className="text-purple-600 text-lg leading-none flex-shrink-0">
                  {open === i ? "\u2212" : "+"}
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 -mt-1 text-sm text-ink-600 leading-relaxed">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Still stuck?</h2>

        {sent ? (
          <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center">
            <p className="text-ink-900 font-medium">Message sent.</p>
            <p className="text-sm text-ink-600 mt-1">
              We read every one of these. You&apos;ll hear back at your account email.
            </p>
            <button
              onClick={() => { setSent(false); setType(""); setMessage(""); }}
              className="mt-4 text-sm text-purple-600 hover:underline"
            >
              Send another
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-ink-200 bg-white p-6">
            <label className="block text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">
              What&apos;s this about?
            </label>
            <div className="flex flex-wrap gap-2 mb-5">
              {TYPES.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
                    type === value
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-ink-600 border-ink-200 hover:border-purple-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label
              htmlFor="support-message"
              className="block text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2"
            >
              Your message
            </label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="What happened, and what were you trying to do?"
              className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:border-purple-400"
            />
            <p className="text-xs text-ink-400 mt-1 text-right">{message.length}/2000</p>

            {error && <p className="text-sm text-bad mt-3">{error}</p>}

            <button
              onClick={submit}
              disabled={sending}
              className="mt-4 w-full sm:w-auto bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {sending ? "Sending..." : "Send message"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

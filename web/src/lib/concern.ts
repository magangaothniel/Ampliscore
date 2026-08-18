// Shared crisis-language detection.
//
// This lived inside /api/feedback. Support requests need the same treatment, so
// it moved here rather than being copy-pasted: two copies of a safety check is
// how one of them quietly falls out of date.
//
// Deliberately a narrow, literal phrase list. It is not trying to be clever.
// False negatives are acceptable; false positives on a support form are not,
// because every flag should be worth a human reading it.

const CONCERN = [
  "kill myself",
  "killing myself",
  "end my life",
  "want to die",
  "wanna die",
  "suicidal",
  "suicide",
  "self harm",
  "self-harm",
  "hurt myself",
  "hurting myself",
  "no reason to live",
  "not worth living",
  "better off dead",
  "cant go on",
  "can't go on",
];

export function concernFlag(...parts: (string | null | undefined)[]): boolean {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  return CONCERN.some((phrase) => text.includes(phrase));
}

// Banner markup for alert emails, so both routes render the same thing.
export function concernBanner(): string {
  return `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:14px;margin:0 0 16px 0;">
    <strong style="color:#92400E;">This message contains language that may indicate distress.</strong>
    <p style="color:#92400E;margin:8px 0 0 0;font-size:14px;">
      If you reply, keep it human and point them to 988 (call or text, 24/7).
    </p>
  </div>`;
}

p = "web/src/app/api/beta/followup/route.ts"
s = open(p).read()
assert "redeemed_at" not in s, "already patched"

a = '  const { data: already } = await admin.from("beta_feedback").select("email");'
b = '''  const { data: already } = await admin.from("beta_feedback").select("email");

  // Only ask people who actually opened the app. Asking someone how it has
  // been when they never redeemed their code is a bad email.
  const { data: redeemed } = await admin
    .from("beta_codes")
    .select("issued_to")
    .not("redeemed_at", "is", null);
  const opened = new Set(
    (redeemed || []).map((r: any) => String(r.issued_to || "").toLowerCase())
  );'''
assert a in s, "already fetch not found"
s = s.replace(a, b)

a = '    .filter((t: any) => t.emails_enabled !== false)'
b = '''    .filter((t: any) => t.emails_enabled !== false)
    .filter((t: any) => opened.has(String(t.email || "").toLowerCase()))'''
assert a in s, "targets filter not found"
s = s.replace(a, b)

a = '  return { status: 200, body: { sent: results.length, results } };'
b = '''  // Copy to the operator so you see exactly what went out.
  if (!onlyMe && results.length > 0) {
    try {
      await resend.emails.send({
        from: "Ampliscore <noreply@ampliscore.app>",
        to: OPERATOR,
        subject: `[copy] Feedback request sent to ${results.length} tester(s)`,
        html: html("Othniel", "https://ampliscore.app"),
      });
    } catch (e) {
      console.error("Operator copy failed:", e);
    }
  }

  return { status: 200, body: { sent: results.length, results } };'''
assert a in s, "return not found"
s = s.replace(a, b)

open(p, "w").write(s)
print("followup: redeemers only, plus operator copy")

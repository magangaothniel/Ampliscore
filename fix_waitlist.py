p = "web/src/app/api/waitlist/route.ts"
s = open(p).read()

if "waitlistWelcomeHtml" in s:
    print("already rewritten, nothing to do")
    raise SystemExit(0)

anchor = 'import { NextRequest, NextResponse } from "next/server";'
s = s.replace(anchor, anchor + '\nimport { waitlistWelcomeHtml } from "@/lib/waitlistWelcome";')

start = s.index("  // Confirm to the person who signed up")
end = s.index("  // Tell the operator")

block = '''  // Confirm to the person who signed up
  try {
    await resend.emails.send({
      from: "Ampliscore <noreply@ampliscore.app>",
      to: email,
      replyTo: ALERT_TO,
      subject: "Here is what you signed up for",
      html: waitlistWelcomeHtml(name, email, unsubToken),
    });
    await admin
      .from("waitlist")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("email", email);
  } catch (e) {
    console.error("Waitlist welcome failed:", e);
  }

'''

s = s[:start] + block + s[end:]
open(p, "w").write(s)
print("rewrote", p)

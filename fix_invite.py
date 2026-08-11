p = "web/src/app/api/beta/invite/route.ts"
s = open(p).read()

if "@/lib/betaInvite" in s:
    print("already rewritten, nothing to do")
    raise SystemExit(0)

start = s.index("const esc =")
end = s.index("export async function POST")
s = s[:start] + s[end:]

anchor = 'import { NextRequest, NextResponse } from "next/server";'
s = s.replace(anchor, anchor + '\nimport { inviteHtml } from "@/lib/betaInvite";')

open(p, "w").write(s)
print("rewrote", p)

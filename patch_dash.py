p = "web/src/app/(dashboard)/dashboard/page.tsx"
s = open(p).read()

if "upcoming" in s:
    print("already patched, nothing to do")
    raise SystemExit(0)

# 1. derive upcoming items from data already in state
anchor = '  const gpa = calculateGPA('
assert anchor in s, "gpa line not found"

derive = '''  // Ungraded work with a due date, soonest first. Past-due items stay in
  // the list: hiding something you missed is the wrong kind of tidy.
  const upcoming = assignments
    .filter((a: any) => !a.completed && a.due_date)
    .map((a: any) => {
      const due = new Date(a.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDay = new Date(due);
      dueDay.setHours(0, 0, 0, 0);
      const days = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
      const course = courses.find((c: any) => c.id === a.course_id);
      return { ...a, due, days, course };
    })
    .sort((a: any, b: any) => a.due.getTime() - b.due.getTime())
    .slice(0, 4);

  const dueLabel = (d: number) =>
    d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : `In ${d} days`;

'''
s = s.replace(anchor, derive + anchor, 1)

# 2. render the strip above the Pro teasers
anchor2 = '        {/* Pro feature teasers */}'
assert anchor2 in s, "teaser anchor not found"

block = '''        {/* Due next */}
        <div className="bg-white rounded-xl border border-ink-200 shadow-card p-4 md:p-5 mb-6">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Due next</h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="py-1">
              <p className="text-sm text-ink-900 font-medium mb-1">Nothing scheduled yet</p>
              <p className="text-sm text-ink-400 leading-relaxed">
                Add a due date when you enter an assignment and it shows up here,
                with an email reminder 24 hours before.{" "}
                <Link href="/courses" className="text-brand-600 font-medium hover:underline">Go to your courses</Link>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {upcoming.map((a: any) => (
                <li key={a.id}>
                  <Link href={`/courses/${a.course_id}`} className="flex items-center gap-3 py-2.5 group">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: a.course?.color || "#7C3AED" }}
                    />
                    <span className="text-sm text-ink-900 font-medium truncate group-hover:text-brand-600">
                      {a.name}
                    </span>
                    {a.is_exam && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded flex-shrink-0">Exam</span>
                    )}
                    <span className="text-xs text-ink-400 truncate hidden sm:inline">{a.course?.name}</span>
                    <span className={`ml-auto text-xs font-medium flex-shrink-0 ${a.days < 0 ? "text-red-600" : a.days <= 1 ? "text-brand-600" : "text-ink-400"}`}>
                      {dueLabel(a.days)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

'''
s = s.replace(anchor2, block + anchor2, 1)

open(p, "w").write(s)
print("patched dashboard")

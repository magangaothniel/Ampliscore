p = "web/src/app/(dashboard)/courses/[id]/page.tsx"
s = open(p).read()

if "Upcoming work" in s:
    print("already patched, nothing to do")
    raise SystemExit(0)

# split the list into upcoming and graded
old = '''            {assignments.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-ink-400 mb-1">No grades yet</p>
                <p className="text-xs text-ink-400">Add categories first, then grades</p>
              </div>
            ) : ('''

new = '''            {assignments.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-ink-400 mb-1">Nothing here yet</p>
                <p className="text-xs text-ink-400">Add categories first, then grades or upcoming work</p>
              </div>
            ) : ('''
assert old in s, "empty state not found"
s = s.replace(old, new)

old2 = '''              <div className="divide-y divide-ink-100 max-h-80 overflow-y-auto">
                {assignments.map(a => {
                  const pct = Math.round((a.grade / a.max_grade) * 100);
                  const cat = categories.find(c => c.id === a.category_id);
                  return (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-sm font-medium text-ink-900">{a.name}</div>
                        <div className="text-xs text-ink-400">{cat?.name || "Unknown"}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getGradeColor(pct)}`}>{a.grade}/{a.max_grade}</div>
                          <div className="text-xs text-ink-400">{pct}%</div>
                        </div>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="text-ink-400 hover:text-bad transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>'''

new2 = '''              <div className="max-h-80 overflow-y-auto">
                {([
                  { key: "upcoming", label: "Upcoming work", rows: assignments.filter((a: any) => !a.completed) },
                  { key: "graded", label: "Graded", rows: assignments.filter((a: any) => a.completed) },
                ] as const).map((group) => group.rows.length === 0 ? null : (
                  <div key={group.key}>
                    <div className="px-5 py-2 bg-brand-50/60 text-[11px] font-semibold uppercase tracking-wide text-ink-400 border-y border-ink-100">
                      {group.label} <span className="text-ink-300">{group.rows.length}</span>
                    </div>
                    <div className="divide-y divide-ink-100">
                      {group.rows.map((a: any) => {
                        const cat = categories.find((c: any) => c.id === a.category_id);
                        const pct = Math.round((a.grade / a.max_grade) * 100);
                        const due = a.due_date ? new Date(a.due_date) : null;
                        return (
                          <div key={a.id} className="flex items-center justify-between px-5 py-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink-900 flex items-center gap-2">
                                <span className="truncate">{a.name}</span>
                                {a.is_exam && <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded flex-shrink-0">Exam</span>}
                              </div>
                              <div className="text-xs text-ink-400">
                                {cat?.name || "Unknown"}
                                {due && ` !·  due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                {a.completed ? (
                                  <>
                                    <div className={`text-sm font-medium ${getGradeColor(pct)}`}>{a.grade}/{a.max_grade}</div>
                                    <div className="text-xs text-ink-400">{pct}%</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-sm font-medium text-ink-300 tnum">—/{a.max_grade}</div>
                                    <div className="text-xs text-ink-400">not graded</div>
                                  </>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteAssignment(a.id)}
                                className="text-ink-400 hover:text-bad transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>'''
assert old2 in s, "list block not found"
s = s.replace(old2, new2)

open(p, "w").write(s)
print("split upcoming and graded")

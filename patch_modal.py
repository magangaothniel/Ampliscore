import re

p = "web/src/app/(dashboard)/courses/[id]/page.tsx"
s = open(p).read()

if "due_date" in s:
    print("already patched, nothing to do")
    raise SystemExit(0)

# 1. form state gains due_date and is_exam
old_state = 'const [assignForm, setAssignForm] = useState({ name: "", grade: "", max_grade: "100", category_id: "", completed: true });'
new_state = 'const [assignForm, setAssignForm] = useState({ name: "", grade: "", max_grade: "100", category_id: "", completed: true, due_date: "", is_exam: false });'
assert old_state in s, "form state not found"
s = s.replace(old_state, new_state)

# 2. score field no longer required
old_score = '''                    placeholder="e.g. 85"
                    required min="0"'''
new_score = '''                    placeholder="Leave blank if not graded yet"
                    min="0"'''
assert old_score in s, "score input not found"
s = s.replace(old_score, new_score)

# 3. insert due date + exam toggle before the button row of the assignment form
anchor = '''              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAssignModal(false)}'''
new_fields = '''              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Due date <span className="text-ink-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={assignForm.due_date}
                  onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
                <p className="text-xs text-ink-400 mt-1.5">
                  Add a date and this shows on your calendar with a reminder 24 hours before.
                </p>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignForm.is_exam}
                  onChange={(e) => setAssignForm({ ...assignForm, is_exam: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-200 text-brand-600 focus:ring-brand-100"
                />
                <span className="text-sm text-ink-900">This is an exam</span>
              </label>
'''
assert anchor in s, "button row anchor not found"
s = s.replace(anchor, new_fields + anchor, 1)

open(p, "w").write(s)
print("patched modal")

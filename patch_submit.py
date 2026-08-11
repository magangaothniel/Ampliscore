p = "web/src/app/(dashboard)/courses/[id]/page.tsx"
s = open(p).read()

if "isUpcoming" in s:
    print("already patched, nothing to do")
    raise SystemExit(0)

# 1. derive upcoming vs graded from whether a score was typed
old = '''    const gradeVal = parseFloat(assignForm.grade);
    const maxVal = parseFloat(assignForm.max_grade);'''
new = '''    // A blank score means the work has not been graded yet. Those rows are
    // stored with completed:false, which every grade calculation already skips.
    const isUpcoming = assignForm.grade.trim() === "";
    const gradeVal = isUpcoming ? 0 : parseFloat(assignForm.grade);
    const maxVal = parseFloat(assignForm.max_grade) || 100;

    if (isUpcoming && !assignForm.due_date) {
      setOptimisticError("Add a score, or a due date if it is not graded yet.");
      return;
    }
    if (!isUpcoming && Number.isNaN(gradeVal)) {
      setOptimisticError("That score does not look like a number.");
      return;
    }

    const dueIso = assignForm.due_date
      ? new Date(`${assignForm.due_date}T23:59:00`).toISOString()
      : null;'''
assert old in s, "parse block not found"
s = s.replace(old, new)

# 2. optimistic row carries the new fields
old2 = '''      completed: assignForm.completed,
      created_at: new Date().toISOString(),
    };'''
new2 = '''      completed: !isUpcoming,
      due_date: dueIso,
      is_exam: assignForm.is_exam,
      created_at: new Date().toISOString(),
    };'''
assert old2 in s, "optimistic row not found"
s = s.replace(old2, new2)

# 3. reset the new fields too
old3 = 'setAssignForm({ name: "", grade: "", max_grade: "100", category_id: "", completed: true });'
new3 = 'setAssignForm({ name: "", grade: "", max_grade: "100", category_id: "", completed: true, due_date: "", is_exam: false });'
assert old3 in s, "form reset not found"
s = s.replace(old3, new3)

# 4. persist the new columns
old4 = '''        completed: optimisticRow.completed,
      })'''
new4 = '''        completed: optimisticRow.completed,
        due_date: dueIso,
        is_exam: assignForm.is_exam,
      })'''
assert old4 in s, "insert block not found"
s = s.replace(old4, new4)

open(p, "w").write(s)
print("patched submit handler")

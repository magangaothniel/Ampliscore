import type React from 'react'
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Switch, Alert, ActivityIndicator, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const { width } = Dimensions.get('window')
const CELL = Math.floor((width - 40) / 7)

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Course = { id: string; name: string; code: string | null; color: string | null }
type Category = { id: string; course_id: string; name: string }
type Assignment = {
  id: string
  course_id: string
  category_id: string | null
  name: string
  due_date: string | null
  completed: boolean
  is_exam: boolean
  max_grade: number | null
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function CalendarScreen() {
  const [cursor, setCursor] = useState(new Date())
  const [selected, setSelected] = useState<Date>(new Date())
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aName, setAName] = useState('')
  const [aCourse, setACourse] = useState('')
  const [aCategory, setACategory] = useState('')
  const [aMax, setAMax] = useState('100')
  const [aIsExam, setAIsExam] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [cRes, aRes] = await Promise.all([
        supabase.from('courses').select('id, name, code, color').eq('user_id', user.id),
        supabase.from('assignments').select('*').eq('user_id', user.id),
      ])
      if (cRes.error) console.error('COURSES ERROR:', cRes.error.message)
      if (aRes.error) console.error('ASSIGNMENTS ERROR:', aRes.error.message)

      const courseRows = cRes.data ?? []
      setCourses(courseRows)
      setAssignments(aRes.data ?? [])

      // grade_categories is keyed by course_id, so fetch by the user's courses.
      if (courseRows.length > 0) {
        const { data: catData, error: catErr } = await supabase
          .from('grade_categories')
          .select('id, course_id, name')
          .in('course_id', courseRows.map(c => c.id))
        if (catErr) console.error('CATEGORIES ERROR:', catErr.message)
        setCategories(catData ?? [])
      } else {
        setCategories([])
      }
    } finally {
      setLoading(false)
    }
  }

  // ---- month grid ----
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay())

  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push(d)
  }
  // Drop the trailing week when it belongs entirely to the next month.
  const weeks = cells[35].getMonth() === cursor.getMonth() ? 6 : 5
  const visible = cells.slice(0, weeks * 7)

  const dated = assignments.filter(a => a.due_date)
  const itemsOn = useCallback(
    (d: Date) =>
      dated
        .filter(a => sameDay(new Date(a.due_date as string), d))
        .sort((x, y) => Number(y.is_exam) - Number(x.is_exam)),
    [dated],
  )

  const courseOf = (id: string) => courses.find(c => c.id === id)
  const selectedItems = itemsOn(selected)

  function shiftMonth(by: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + by, 1))
  }

  function openAdd() {
    if (courses.length === 0) {
      return Alert.alert('Add a course first', 'Assignments belong to a course.')
    }
    setAName('')
    setACourse(courses[0].id)
    setACategory('')
    setAMax('100')
    setAIsExam(false)
    setAddOpen(true)
  }

  async function addAssignment() {
    if (!aName.trim()) return Alert.alert('Missing field', 'Give the assignment a name.')
    if (!aCourse) return Alert.alert('Missing field', 'Pick a course.')

    setSaving(true)
    try {
      // Store noon local so a timezone shift can't move it to the day before.
      const due = new Date(selected)
      due.setHours(12, 0, 0, 0)

      const { error } = await supabase.from('assignments').insert({
        user_id: userId,
        course_id: aCourse,
        category_id: aCategory || null,
        name: aName.trim(),
        due_date: due.toISOString(),
        max_grade: parseFloat(aMax) || 100,
        completed: false,
        is_exam: aIsExam,
      })
      if (error) return Alert.alert('Error', error.message)

      setAddOpen(false)
      fetchAll()
    } finally {
      setSaving(false)
    }
  }

  async function toggleCompleted(a: Assignment) {
    const previous = assignments
    setAssignments(previous.map(r => (r.id === a.id ? { ...r, completed: !r.completed } : r)))
    const { error } = await supabase
      .from('assignments').update({ completed: !a.completed }).eq('id', a.id)
    if (error) {
      setAssignments(previous)
      Alert.alert('Error', 'Could not update that.')
    }
  }

  const today = new Date()
  const catsForCourse = categories.filter(c => c.course_id === aCourse)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Calendar</Text>
            <Text style={styles.sub}>Every due date in one place</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthBar}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={20} color="#7C3AED" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={12} style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <View style={styles.dayRow}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={styles.dayLabel}>{d}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {visible.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth()
            const items = itemsOn(d)
            const isToday = sameDay(d, today)
            const isSelected = sameDay(d, selected)
            return (
              <TouchableOpacity
                key={i}
                style={[styles.cell, isSelected && styles.cellSelected]}
                onPress={() => setSelected(d)}
              >
                <Text
                  style={[
                    styles.cellNum,
                    !inMonth && styles.cellNumMuted,
                    isToday && styles.cellNumToday,
                    isSelected && styles.cellNumSelected,
                  ]}
                >
                  {d.getDate()}
                </Text>
                <View style={styles.dotRow}>
                  {items.slice(0, 3).map(a => (
                    <View
                      key={a.id}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: a.completed
                            ? '#C4B5FD'
                            : courseOf(a.course_id)?.color || '#7C3AED',
                        },
                        a.is_exam && styles.dotExam,
                      ]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.selectedLabel}>
          {selected.toLocaleDateString(undefined, {
            weekday: 'long', month: 'long', day: 'numeric',
          })}
        </Text>

        {selectedItems.length === 0 ? (
          <Text style={styles.empty}>Nothing due. Tap Add to put something here.</Text>
        ) : (
          selectedItems.map(a => {
            const course = courseOf(a.course_id)
            return (
              <View key={a.id} style={styles.item}>
                <TouchableOpacity onPress={() => toggleCompleted(a)} hitSlop={8} style={styles.check}>
                  <Ionicons
                    name={a.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={21}
                    color={a.completed ? '#10B981' : '#C4B5FD'}
                  />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.itemName, a.completed && styles.itemDone]}>{a.name}</Text>
                    {a.is_exam ? (
                      <View style={styles.examTag}><Text style={styles.examTagText}>Exam</Text></View>
                    ) : null}
                  </View>
                  <Text style={styles.itemMeta}>{course?.name || 'No course'}</Text>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      <Modal visible={addOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New assignment</Text>
            <TouchableOpacity onPress={() => setAddOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.dueNote}>
              Due {selected.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} placeholder="Problem set 4" placeholderTextColor="#C4B5FD" value={aName} onChangeText={setAName} />

            <Text style={styles.label}>Course</Text>
            <View style={styles.chipWrap}>
              {courses.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, aCourse === c.id && styles.chipActive]}
                  onPress={() => { setACourse(c.id); setACategory('') }}
                >
                  <Text style={[styles.chipText, aCourse === c.id && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {catsForCourse.length > 0 ? (
              <>
                <Text style={styles.label}>Category (optional)</Text>
                <View style={styles.chipWrap}>
                  {catsForCourse.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, aCategory === c.id && styles.chipActive]}
                      onPress={() => setACategory(aCategory === c.id ? '' : c.id)}
                    >
                      <Text style={[styles.chipText, aCategory === c.id && styles.chipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.label}>Points possible</Text>
            <TextInput style={styles.input} placeholder="100" placeholderTextColor="#C4B5FD" value={aMax} onChangeText={setAMax} keyboardType="decimal-pad" />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>This is an exam</Text>
              <Switch value={aIsExam} onValueChange={setAIsExam} trackColor={{ true: '#7C3AED', false: '#DDD6FE' }} />
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={addAssignment} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add to calendar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14 },
  title: { fontSize: 26, fontWeight: '700', color: '#1E1333' },
  sub: { fontSize: 14, color: '#A78BFA', marginTop: 2 },
  addBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 16 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  monthArrow: { padding: 6 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1E1333' },

  dayRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
  dayLabel: { width: CELL, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#A78BFA' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cellSelected: { backgroundColor: '#EDE9FE' },
  cellNum: { fontSize: 14, color: '#1E1333' },
  cellNumMuted: { color: '#D8D2E8' },
  cellNumToday: { color: '#7C3AED', fontWeight: '800' },
  cellNumSelected: { fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 3, marginTop: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotExam: { width: 9 },

  selectedLabel: { fontSize: 15, fontWeight: '700', color: '#1E1333', paddingHorizontal: 20, marginTop: 22, marginBottom: 10 },
  empty: { fontSize: 14, color: '#A78BFA', paddingHorizontal: 20, lineHeight: 20 },

  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 8, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14 },
  check: { paddingRight: 11 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1E1333', flexShrink: 1 },
  itemDone: { textDecorationLine: 'line-through', color: '#A78BFA' },
  itemMeta: { fontSize: 12.5, color: '#A78BFA', marginTop: 2 },
  examTag: { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  examTagText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },

  modal: { flex: 1, backgroundColor: '#F5F3FF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E1333' },
  modalClose: { fontSize: 16, color: '#7C3AED', fontWeight: '600' },
  modalBody: { padding: 20, paddingTop: 4, paddingBottom: 48 },
  dueNote: { fontSize: 14, color: '#7C3AED', fontWeight: '600' },

  label: { fontSize: 12, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7, marginTop: 18 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, color: '#1E1333', borderWidth: 1, borderColor: '#EDE9FE' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 99, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#fff', paddingVertical: 9, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { fontSize: 13.5, color: '#5B5470' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  switchLabel: { fontSize: 15, color: '#1E1333' },

  saveBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})

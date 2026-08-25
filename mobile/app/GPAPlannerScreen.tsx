import { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, InputAccessoryView, Keyboard, Platform } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { gradePoints, semesterGpa, cumulativeGpa, formatGpa, courseGrade } from '../lib/gpa'
import { isCurrentTerm } from '../lib/terms'

type Course = {
  id: string
  name: string
  credits: number
  current_grade: number | null
}


function getLetterGrade(pct: number): string {
  if (pct >= 93) return 'A'
  if (pct >= 90) return 'A-'
  if (pct >= 87) return 'B+'
  if (pct >= 83) return 'B'
  if (pct >= 80) return 'B-'
  if (pct >= 77) return 'C+'
  if (pct >= 73) return 'C'
  if (pct >= 70) return 'C-'
  if (pct >= 60) return 'D'
  return 'F'
}

function getGradeColor(pct: number): string {
  if (pct >= 90) return '#16a34a'
  if (pct >= 80) return '#7C3AED'
  if (pct >= 70) return '#d97706'
  return '#dc2626'
}

const ACCESSORY_ID = 'gpaTargetDone'

export default function GPAPlannerScreen() {
  const [courses, setCourses] = useState<Course[]>([])
  const [prior, setPrior] = useState<{ gpa: number | null; credits: number | null }>({ gpa: null, credits: null })
  const [loading, setLoading] = useState(true)
  const [targetGPA, setTargetGPA] = useState('3.5')
  const [targetGrades, setTargetGrades] = useState<Record<string, string>>({})

  // Screens stay mounted under React Navigation, so a mount-only fetch
  // leaves stale numbers behind after edits on another tab. Refetch on
  // focus instead: on demand, and free when nobody is looking.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      fetchCourses(!firstFocus.current)
      firstFocus.current = false
    }, [])
  )

  async function fetchCourses(silent = false) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Recomputed from assignments, matching every other screen. Reading the
    // stored column here would put the planner out of step with the dashboard.
    const [coursesRes, catsRes, assignsRes] = await Promise.all([
      supabase.from('courses').select('id, name, credits, current_grade, semester, year').eq('user_id', user.id),
      supabase.from('grade_categories').select('id, course_id, weight'),
      supabase.from('assignments').select('course_id, category_id, grade, max_grade, completed').eq('user_id', user.id),
    ])

    if (coursesRes.data) {
      const allCats = catsRes.data ?? []
      const allAssigns = assignsRes.data ?? []
      // Matches the dashboard: planning is about the term in progress, so a
      // finished course shouldn't sit in the what-if sliders.
      const rows = coursesRes.data
        .filter((c: any) => isCurrentTerm(c.semester, c.year))
        .map(c => {
        const g = courseGrade(
          allCats.filter(k => k.course_id === c.id),
          allAssigns.filter(a => a.course_id === c.id)
        )
        return { ...c, current_grade: g > 0 ? g : null }
      })
      setCourses(rows)
      const initial: Record<string, string> = {}
      rows.forEach(c => {
        initial[c.id] = c.current_grade ? String(Math.round(c.current_grade)) : '85'
      })
      setTargetGrades(initial)
    }

    // The planner showed semester-only figures while the dashboard showed
    // cumulative, so the same student saw two different GPAs.
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('prior_gpa, prior_credits')
      .eq('id', user.id)
      .single()
    setPrior({
      gpa: (profileRow as any)?.prior_gpa ?? null,
      credits: (profileRow as any)?.prior_credits ?? null,
    })
    setLoading(false)
  }

  // Both figures blend with what the student was carrying in, so the planner
  // agrees with the dashboard. With no prior data they fall back to
  // semester-only, which is what they always were.
  function blend(rows: { current_grade: number | null; credits: number | null }[]): number | null {
    const sem = semesterGpa(rows)
    const cum = cumulativeGpa(sem, prior.gpa, prior.credits)
    return cum !== null ? cum : sem.gpa
  }

  const hasPrior = prior.gpa !== null && prior.credits !== null && prior.credits > 0

  const currentGPA = blend(courses)
  const projectedGPA = blend(
    courses.map(c => ({
      current_grade: parseFloat(targetGrades[c.id] || '85'),
      credits: c.credits || 3,
    }))
  )
  const target = parseFloat(targetGPA) || 3.5
  const onTrack = (projectedGPA ?? 0) >= target

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>GPA Planner</Text>
        <Text style={styles.sub}>Simulate your semester outcome</Text>
      </View>

      {/* GPA cards */}
      <View style={styles.gpaRow}>
        <View style={styles.gpaCard}>
          <Text style={styles.gpaLabel}>{hasPrior ? 'Cumulative' : 'Current GPA'}</Text>
          <Text style={[styles.gpaVal, { color: '#7C3AED' }]}>{formatGpa(currentGPA)}</Text>
        </View>
        <View style={styles.arrow}><Text style={styles.arrowText}>→</Text></View>
        <View style={styles.gpaCard}>
          <Text style={styles.gpaLabel}>Projected</Text>
          <Text style={[styles.gpaVal, { color: onTrack ? '#16a34a' : '#dc2626' }]}>{formatGpa(projectedGPA)}</Text>
        </View>
      </View>

      {/* Target GPA */}
      <View style={styles.targetCard}>
        <Text style={styles.targetLabel}>Target GPA</Text>
        <TextInput
          style={styles.targetInput}
          value={targetGPA}
          onChangeText={setTargetGPA}
          keyboardType="decimal-pad"
          maxLength={4}
          returnKeyType="done"
          inputAccessoryViewID={ACCESSORY_ID}
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <View style={[styles.trackBadge, { backgroundColor: onTrack ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.trackText, { color: onTrack ? '#16a34a' : '#dc2626' }]}>
            {onTrack ? '✓ On track' : '✗ Below target'}
          </Text>
        </View>
      </View>

      {/* Course simulators */}
      {courses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add courses to start planning your GPA</Text>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What grades do you need?</Text>
          {courses.map(course => {
            const grade = parseFloat(targetGrades[course.id] || '85')
            return (
              <View key={course.id} style={styles.courseCard}>
                <View style={styles.courseTop}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseCredits}>{course.credits} cr</Text>
                </View>
                <View style={styles.sliderRow}>
                  <Text style={styles.gradeNum}>{targetGrades[course.id] || '85'}%</Text>
                  <Text style={[styles.gradeLetter, { color: getGradeColor(grade) }]}>
                    {getLetterGrade(grade)}
                  </Text>
                  <Text style={styles.gpaPoints}>{gradePoints(grade).toFixed(1)} pts</Text>
                </View>
                <View style={styles.inputRow}>
                  {[60, 70, 77, 83, 87, 90, 93].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.gradeBtn, parseFloat(targetGrades[course.id] || '85') === val && styles.gradeBtnActive]}
                      onPress={() => setTargetGrades(prev => ({ ...prev, [course.id]: String(val) }))}
                    >
                      <Text style={[styles.gradeBtnText, parseFloat(targetGrades[course.id] || '85') === val && styles.gradeBtnTextActive]}>
                        {getLetterGrade(val)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )
          })}
        </View>
      )}
      <View style={{ height: 40 }} />
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View style={styles.accessoryBar}>
            <TouchableOpacity onPress={() => Keyboard.dismiss()}>
              <Text style={styles.accessoryDone}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  accessoryBar: { backgroundColor: '#EDE9FE', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#DDD6FE' },
  accessoryDone: { color: '#7C3AED', fontSize: 16, fontWeight: '600' },
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1E1333' },
  sub: { fontSize: 14, color: '#A78BFA', marginTop: 2 },
  gpaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  gpaCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  gpaLabel: { fontSize: 11, color: '#A78BFA', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  gpaVal: { fontSize: 32, fontWeight: '700' },
  arrow: { paddingHorizontal: 12 },
  arrowText: { fontSize: 24, color: '#C4B5FD' },
  targetCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  targetLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E1333' },
  targetInput: { backgroundColor: '#F5F3FF', borderRadius: 10, padding: 8, width: 64, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#7C3AED', borderWidth: 1.5, borderColor: '#DDD6FE', marginRight: 12 },
  trackBadge: { borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
  trackText: { fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E1333', marginBottom: 12 },
  courseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  courseTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  courseName: { fontSize: 15, fontWeight: '600', color: '#1E1333' },
  courseCredits: { fontSize: 12, color: '#A78BFA' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  gradeNum: { fontSize: 20, fontWeight: '700', color: '#1E1333' },
  gradeLetter: { fontSize: 16, fontWeight: '700' },
  gpaPoints: { fontSize: 13, color: '#A78BFA', marginLeft: 'auto' },
  inputRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  gradeBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' },
  gradeBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  gradeBtnText: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
  gradeBtnTextActive: { color: '#fff' },
  empty: { margin: 20, backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#A78BFA', textAlign: 'center' },
})

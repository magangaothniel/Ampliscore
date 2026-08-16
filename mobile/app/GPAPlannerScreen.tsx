import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, InputAccessoryView, Keyboard, Platform } from 'react-native'
import { supabase } from '../lib/supabase'

type Course = {
  id: string
  name: string
  credits: number
  current_grade: number | null
}

function getGPA(pct: number): number {
  if (pct >= 93) return 4.0
  if (pct >= 90) return 3.7
  if (pct >= 87) return 3.3
  if (pct >= 83) return 3.0
  if (pct >= 80) return 2.7
  if (pct >= 77) return 2.3
  if (pct >= 73) return 2.0
  if (pct >= 70) return 1.7
  if (pct >= 60) return 1.0
  return 0.0
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
  const [loading, setLoading] = useState(true)
  const [targetGPA, setTargetGPA] = useState('3.5')
  const [targetGrades, setTargetGrades] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCourses()
  }, [])

  async function fetchCourses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('courses')
      .select('id, name, credits, current_grade')
      .eq('user_id', user.id)
    if (data) {
      setCourses(data)
      const initial: Record<string, string> = {}
      data.forEach(c => {
        initial[c.id] = c.current_grade ? String(Math.round(c.current_grade)) : '85'
      })
      setTargetGrades(initial)
    }
    setLoading(false)
  }

  function calcCurrentGPA(): number {
    const graded = courses.filter(c => c.current_grade !== null && c.credits)
    if (!graded.length) return 0
    const totalPoints = graded.reduce((s, c) => s + getGPA(c.current_grade!) * c.credits, 0)
    const totalCredits = graded.reduce((s, c) => s + c.credits, 0)
    return totalPoints / totalCredits
  }

  function calcProjectedGPA(): number {
    if (!courses.length) return 0
    const totalPoints = courses.reduce((s, c) => {
      const grade = parseFloat(targetGrades[c.id] || '85')
      return s + getGPA(grade) * (c.credits || 3)
    }, 0)
    const totalCredits = courses.reduce((s, c) => s + (c.credits || 3), 0)
    return totalPoints / totalCredits
  }

  const currentGPA = calcCurrentGPA()
  const projectedGPA = calcProjectedGPA()
  const target = parseFloat(targetGPA) || 3.5
  const onTrack = projectedGPA >= target

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
          <Text style={styles.gpaLabel}>Current GPA</Text>
          <Text style={[styles.gpaVal, { color: '#7C3AED' }]}>{currentGPA.toFixed(2)}</Text>
        </View>
        <View style={styles.arrow}><Text style={styles.arrowText}>→</Text></View>
        <View style={styles.gpaCard}>
          <Text style={styles.gpaLabel}>Projected</Text>
          <Text style={[styles.gpaVal, { color: onTrack ? '#16a34a' : '#dc2626' }]}>{projectedGPA.toFixed(2)}</Text>
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
                  <Text style={styles.gpaPoints}>{getGPA(grade).toFixed(1)} pts</Text>
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

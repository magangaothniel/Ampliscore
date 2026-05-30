import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Course = {
  id: string
  name: string
  course_code: string
  professor: string
  credits: number
  current_grade: number | null
}

type Profile = {
  full_name: string | null
  is_pro: boolean
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

export default function DashboardScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, coursesRes] = await Promise.all([
        supabase.from('profiles').select('full_name, is_pro').eq('id', user.id).single(),
        supabase.from('courses').select('id, name, course_code, professor, credits, current_grade').eq('user_id', user.id).order('created_at', { ascending: false })
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (coursesRes.data) setCourses(coursesRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function calcGPA(): string {
    const graded = courses.filter(c => c.current_grade !== null && c.credits)
    if (!graded.length) return '—'
    const totalPoints = graded.reduce((sum, c) => sum + getGPA(c.current_grade!) * c.credits, 0)
    const totalCredits = graded.reduce((sum, c) => sum + c.credits, 0)
    return (totalPoints / totalCredits).toFixed(2)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const atRisk = courses.filter(c => c.current_grade !== null && c.current_grade < 70).length
  const avgGrade = courses.length
    ? Math.round(courses.filter(c => c.current_grade !== null).reduce((s, c) => s + (c.current_grade || 0), 0) / courses.filter(c => c.current_grade !== null).length)
    : null

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey {firstName} 👋</Text>
          <Text style={styles.subGreeting}>Here's how your semester is looking</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Current GPA</Text>
          <Text style={[styles.statValue, { color: '#7C3AED' }]}>{calcGPA()}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Courses</Text>
          <Text style={styles.statValue}>{courses.length}</Text>
        </View>
        <View style={[styles.statCard, atRisk > 0 && styles.atRiskCard]}>
          <Text style={styles.statLabel}>At-risk</Text>
          <Text style={[styles.statValue, { color: atRisk > 0 ? '#dc2626' : '#1E1333' }]}>{atRisk}</Text>
        </View>
      </View>

      {/* Average grade banner */}
      {avgGrade !== null && (
        <View style={styles.avgBanner}>
          <Text style={styles.avgLabel}>Semester average</Text>
          <Text style={[styles.avgValue, { color: getGradeColor(avgGrade) }]}>
            {avgGrade}% · {getLetterGrade(avgGrade)}
          </Text>
        </View>
      )}

      {/* Courses section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your courses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Courses')}>
            <Text style={styles.sectionLink}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {courses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No courses yet</Text>
            <Text style={styles.emptySub}>Add your first course to start tracking your grades</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Courses')}>
              <Text style={styles.emptyBtnText}>Add a course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          courses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => navigation.navigate('Courses')}
            >
              <View style={styles.courseLeft}>
                <View style={styles.courseDot} />
                <View>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseSub}>{course.course_code} · {course.professor || 'No professor'}</Text>
                </View>
              </View>
              {course.current_grade !== null ? (
                <View style={styles.courseGradeWrap}>
                  <Text style={[styles.courseGrade, { color: getGradeColor(course.current_grade) }]}>
                    {Math.round(course.current_grade)}%
                  </Text>
                  <Text style={styles.courseLetter}>{getLetterGrade(course.current_grade)}</Text>
                </View>
              ) : (
                <Text style={styles.noGrade}>No grades</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Pro upsell if not pro */}
      {!profile?.is_pro && (
        <TouchableOpacity style={styles.proBanner}>
          <Text style={styles.proTitle}>✦ Upgrade to Pro</Text>
          <Text style={styles.proSub}>AI grade predictor, unlimited courses & more · $4.99/mo</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  loadingContainer: { flex: 1, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#1E1333' },
  subGreeting: { fontSize: 14, color: '#A78BFA', marginTop: 2 },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD6FE' },
  signOutText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  atRiskCard: { borderWidth: 1, borderColor: '#fecaca' },
  statLabel: { fontSize: 11, color: '#A78BFA', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: '700', color: '#1E1333' },
  avgBanner: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avgLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  avgValue: { fontSize: 16, fontWeight: '700' },
  section: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E1333' },
  sectionLink: { fontSize: 14, color: '#7C3AED', fontWeight: '600' },
  courseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  courseLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  courseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED' },
  courseName: { fontSize: 14, fontWeight: '600', color: '#1E1333' },
  courseSub: { fontSize: 12, color: '#A78BFA', marginTop: 2 },
  courseGradeWrap: { alignItems: 'flex-end' },
  courseGrade: { fontSize: 16, fontWeight: '700' },
  courseLetter: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  noGrade: { fontSize: 12, color: '#C4B5FD' },
  emptyState: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E1333', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#A78BFA', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  proBanner: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#7C3AED', borderRadius: 14, padding: 18 },
  proTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  proSub: { fontSize: 12, color: '#DDD6FE' },
})

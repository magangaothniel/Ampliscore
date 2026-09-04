import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { evaluateAchievements, touchWeeklyStreak } from '../lib/achievements'
import { canAskForPush, isPushSupported } from '../lib/notifications'
import { getLetterGrade, getGradeTextColor } from '../lib/grades'
import { semesterGpa, cumulativeGpa, formatGpa, courseGrade } from '../lib/gpa'
import { isCurrentTerm, currentTermLabel } from '../lib/terms'
import * as SecureStore from 'expo-secure-store'
import OnboardingTour from './OnboardingTour'
import ProUpsellModal from './ProUpsellModal'
import NotificationPrimer from './NotificationPrimer'
import InitialGpaPrompt from './InitialGpaPrompt'

type Course = {
  id: string
  name: string
  code: string
  professor: string
  credits: number
  current_grade: number | null
  semester: string | null
  year: number | null
}

type Profile = {
  full_name: string | null
  is_pro: boolean
  has_taken_tour: boolean | null
  gpa_prompt_seen: boolean | null
  prior_gpa: number | null
  prior_credits: number | null
}

const UPSELL_SEEN_KEY = 'pro_upsell_last_shown'
const UPSELL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
// Asking again after two weeks is a reminder. Asking every launch is nagging,
// and a student who taps Don't Allow on the iOS dialog is gone for good.
const PUSH_PRIMER_KEY = 'push_primer_last_shown'
const PUSH_PRIMER_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000


export default function DashboardScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showTour, setShowTour] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)

  // Screens stay mounted under React Navigation, so a mount-only fetch
  // leaves stale numbers behind after edits on another tab. Refetch on
  // focus instead: on demand, and free when nobody is looking.
  const [showPushPrimer, setShowPushPrimer] = useState(false)
  const [showGpaPrompt, setShowGpaPrompt] = useState(false)
  const badgesChecked = useRef(false)
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      fetchData(!firstFocus.current)
      firstFocus.current = false
    }, [])
  )

  async function fetchData(silent = false) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Grades are recomputed here from the same rows the web dashboard uses,
      // rather than read from courses.current_grade. Reading the stored column
      // on one platform while the other recomputed meant the two disagreed
      // whenever the stored value lagged, which is exactly what happened.
      // Recomputing on both sides cannot drift, and it self-heals.
      const [profileRes, coursesRes, catsRes, assignsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, is_pro, has_taken_tour, gpa_prompt_seen, prior_gpa, prior_credits').eq('id', user.id).single(),
        supabase.from('courses').select('id, name, code, professor, credits, current_grade, semester, year').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('grade_categories').select('id, course_id, weight'),
        supabase.from('assignments').select('course_id, category_id, grade, max_grade, completed').eq('user_id', user.id),
      ])

      if (profileRes.error) console.error('PROFILE ERROR:', profileRes.error.message)
      if (coursesRes.error) console.error('COURSES ERROR:', coursesRes.error.message)
      if (catsRes.error) console.error('CATEGORIES ERROR:', catsRes.error.message)
      if (assignsRes.error) console.error('ASSIGNMENTS ERROR:', assignsRes.error.message)

      if (profileRes.data) {
        setProfile(profileRes.data)
        if (!profileRes.data.has_taken_tour) setShowTour(true)
        // Only after the tour, and only once. Skipping counts as answering.
        else if (!profileRes.data.gpa_prompt_seen) setShowGpaPrompt(true)
      }
      const allCats = catsRes.data ?? []
      const allAssigns = assignsRes.data ?? []
      setCourses(
        (coursesRes.data ?? []).map(c => ({
          ...c,
          current_grade: courseGrade(
            allCats.filter(k => k.course_id === c.id),
            allAssigns.filter(a => a.course_id === c.id)
          ),
        }))
      )

      // Badges are secondary. A failure here must never stop the dashboard.
      // Evaluated once per app session rather than on every focus: it is four
      // extra queries and nothing about switching tabs can change the result.
      if (!badgesChecked.current) {
        badgesChecked.current = true
        try {
        await touchWeeklyStreak(supabase, user.id)
        const fresh = await evaluateAchievements(supabase, user.id)
        if (fresh.length > 0) {
          // The permission prompt comes after they dismiss the badge, so the
          // ask lands on a moment they already feel good about rather than
          // stacking an OS dialog on top of the celebration.
          Alert.alert(
            `${fresh[0].icon}  ${fresh[0].name}`,
            fresh.length === 1
              ? fresh[0].description
              : `${fresh[0].description}\n\nPlus ${fresh.length - 1} more.`,
            [{ text: 'Nice', onPress: () => { maybePrimePush().catch(() => {}) } }]
          )
        }
        } catch {
          // Silent by design.
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // The tour runs once. Finishing or skipping it both count, so someone who
  // skips isn't asked again every launch.
  async function finishTour() {
    setShowTour(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ has_taken_tour: true }).eq('id', user.id)
    } catch (e) {
      console.error('TOUR FLAG ERROR:', e)
    }
    maybeShowUpsell()
    // Only once they have a course. A brand new account has no reason to care
    // about notifications yet, and that's the ask most likely to be refused.
    if (courses.length > 0) maybePrimePush()
  }

  // Soft prompt only. Pro users never see it, and it's capped to once a week
  // so dismissing it actually sticks.
  async function maybeShowUpsell() {
    if (profile?.is_pro) return
    try {
      const last = await SecureStore.getItemAsync(UPSELL_SEEN_KEY)
      if (last && Date.now() - Number(last) < UPSELL_COOLDOWN_MS) return
      await SecureStore.setItemAsync(UPSELL_SEEN_KEY, String(Date.now()))
      setShowUpsell(true)
    } catch (e) {
      // SecureStore unavailable; skip rather than nag on every open.
    }
  }

  /**
   * Shows the primer only when asking is still possible and worthwhile.
   * canAskForPush is false once the student has granted or denied at the OS
   * level, so this never appears to someone who already decided.
   */
  async function maybePrimePush() {
    if (!isPushSupported()) return
    if (!(await canAskForPush())) return
    try {
      const last = await SecureStore.getItemAsync(PUSH_PRIMER_KEY)
      if (last && Date.now() - Number(last) < PUSH_PRIMER_COOLDOWN_MS) return
      await SecureStore.setItemAsync(PUSH_PRIMER_KEY, String(Date.now()))
      setShowPushPrimer(true)
    } catch {
      // SecureStore unavailable; skip rather than risk nagging every open.
    }
  }

  // Only this term counts toward the semester figure. A course from a past
  // term is finished work; folding it in would make "this term" meaningless
  // the moment a student has two semesters of courses.
  const termCourses = courses.filter(c => isCurrentTerm(c.semester, c.year))

  // Semester GPA is always shown. Cumulative appears only once the student has
  // told us what they were carrying in, because without prior credits there is
  // nothing to weight against.
  const semester = semesterGpa(termCourses)
  const cumulative = cumulativeGpa(semester, profile?.prior_gpa, profile?.prior_credits)

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const atRisk = termCourses.filter(c => c.current_grade !== null && c.current_grade < 70).length
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
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey {firstName}</Text>
          <Text style={styles.subGreeting}>{currentTermLabel()}</Text>
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{cumulative !== null ? 'Cumulative GPA' : 'Current GPA'}</Text>
          <Text style={[styles.statValue, { color: '#7C3AED' }]}>
            {formatGpa(cumulative !== null ? cumulative : semester.gpa)}
          </Text>
          {cumulative !== null ? (
            <Text style={styles.statSub}>{formatGpa(semester.gpa)} this term</Text>
          ) : null}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Courses</Text>
          <Text style={styles.statValue}>{termCourses.length}</Text>
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
          <Text style={[styles.avgValue, { color: getGradeTextColor(avgGrade) }]}>
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

        {termCourses.length === 0 ? (
          <View style={styles.emptyState}>
            {/* Someone whose only courses are from a past term would otherwise
                see a bare empty state and think their work disappeared. */}
            <Text style={styles.emptyTitle}>
              {courses.length > 0 ? `Nothing in ${currentTermLabel()} yet` : 'No courses yet'}
            </Text>
            <Text style={styles.emptySub}>
              {courses.length > 0
                ? 'Your earlier courses are still under Courses.'
                : 'Add your first course to start tracking your grades'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Courses')}>
              <Text style={styles.emptyBtnText}>Add a course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          termCourses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
            >
              <View style={styles.courseLeft}>
                <View style={styles.courseDot} />
                <View>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseSub}>{course.code} · {course.professor || 'No professor'}</Text>
                </View>
              </View>
              {course.current_grade !== null ? (
                <View style={styles.courseGradeWrap}>
                  <Text style={[styles.courseGrade, { color: getGradeTextColor(course.current_grade) }]}>
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
        <TouchableOpacity style={styles.proBanner} onPress={() => setShowUpsell(true)}>
          <Text style={styles.proTitle}>✦ Upgrade to Pro</Text>
          <Text style={styles.proSub}>AI grade predictor, unlimited courses & more · $4.99/mo</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>

    <OnboardingTour visible={showTour} onDone={finishTour} />
    <InitialGpaPrompt
      visible={showGpaPrompt}
      onDone={() => { setShowGpaPrompt(false); fetchData(true) }}
    />
    <NotificationPrimer visible={showPushPrimer} onDone={() => setShowPushPrimer(false)} />
    <ProUpsellModal
      visible={showUpsell}
      reason="intro"
      onClose={() => setShowUpsell(false)}
      onPurchased={() => fetchData(true)}
    />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  loadingContainer: { flex: 1, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#1E1333' },
  subGreeting: { fontSize: 14, color: '#A78BFA', marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  atRiskCard: { borderWidth: 1, borderColor: '#fecaca' },
  statSub: { fontSize: 10.5, color: '#A78BFA', marginTop: 2, fontWeight: '600' },
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

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, ActivityIndicator
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { courseGrade } from '../lib/gpa'
import { TERMS, currentTerm, defaultYearFor, yearsForTerm, formatTerm, type Term } from '../lib/terms'
import { getLetterGrade, getGradeTextColor, getGradeBarColor } from '../lib/grades'
import ProUpsellModal from './ProUpsellModal'

type Course = {
  id: string
  name: string
  code: string
  professor: string
  credits: number
  current_grade: number | null
}

const FREE_LIMIT = 4

export default function CoursesScreen({ navigation }: any) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  // New course form
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [professor, setProfessor] = useState('')
  const [credits, setCredits] = useState('3')
  const [semester, setSemester] = useState<Term>(currentTerm())
  const [year, setYear] = useState(String(defaultYearFor(currentTerm())))

  const [isPro, setIsPro] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)

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
    if (!silent) setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Recomputed from assignments, matching web. Reading the stored column
      // here while web recomputed is what let the two show different grades.
      const [coursesRes, profileRes, catsRes, assignsRes] = await Promise.all([
        supabase
          .from('courses')
          .select('id, name, code, professor, credits, current_grade, color')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('is_pro').eq('id', user.id).single(),
        supabase.from('grade_categories').select('id, course_id, weight'),
        supabase.from('assignments').select('course_id, category_id, grade, max_grade, completed').eq('user_id', user.id),
      ])

      if (coursesRes.error) console.error('COURSES ERROR:', coursesRes.error.message)
      if (profileRes.error) console.error('PROFILE ERROR:', profileRes.error.message)
      if (catsRes.error) console.error('CATEGORIES ERROR:', catsRes.error.message)
      if (assignsRes.error) console.error('ASSIGNMENTS ERROR:', assignsRes.error.message)

      const allCats = catsRes.data ?? []
      const allAssigns = assignsRes.data ?? []
      setCourses(
        (coursesRes.data ?? []).map(c => {
          const g = courseGrade(
            allCats.filter(k => k.course_id === c.id),
            allAssigns.filter(a => a.course_id === c.id)
          )
          return { ...c, current_grade: g > 0 ? g : null }
        })
      )
      setIsPro(!!profileRes.data?.is_pro)
    } finally {
      setLoading(false)
    }
  }

  // Free accounts cap at FREE_LIMIT courses, same as web. Opening the form is
  // where the wall goes, so the user doesn't fill everything in and then get
  // rejected on save.
  function openAddCourse() {
    if (!isPro && courses.length >= FREE_LIMIT) {
      setShowUpsell(true)
      return
    }
    setModalVisible(true)
  }

  async function addCourse() {
    if (!name.trim()) return Alert.alert('Missing field', 'Please enter a course name.')

    // Re-check here too: the list could have changed since the form opened.
    if (!isPro && courses.length >= FREE_LIMIT) {
      setModalVisible(false)
      setShowUpsell(true)
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // semester and year are separate columns on the schema. Sending
      // "Fall 2026" as one string breaks how web filters by term.
      const { error } = await supabase.from('courses').insert({
        user_id: user.id,
        name: name.trim(),
        code: code.trim(),
        professor: professor.trim(),
        credits: parseInt(credits) || 3,
        semester: semester.trim(),
        year: parseInt(year) || new Date().getFullYear(),
        color: '#7C3AED',
      })

      if (error) {
        Alert.alert('Error', error.message)
      } else {
        setModalVisible(false)
        resetForm()
        fetchCourses()
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteCourse(id: string) {
    Alert.alert('Delete course', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('courses').delete().eq('id', id)
          fetchCourses()
        }
      }
    ])
  }

  function resetForm() {
    setName(''); setCode(''); setProfessor(''); setCredits('3'); setSemester(currentTerm()); setYear(String(defaultYearFor(currentTerm())))
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My courses</Text>
          <Text style={styles.sub}>
            {courses.length} course{courses.length !== 1 ? 's' : ''} this semester
            {!isPro ? `  ·  ${courses.length}/${FREE_LIMIT} used` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddCourse}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Course list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No courses yet</Text>
          <Text style={styles.emptySub}>Add your first course to start tracking grades</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAddCourse}>
            <Text style={styles.emptyBtnText}>+ Add a course</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {courses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
              onLongPress={() => deleteCourse(course.id)}
            >
              <View style={styles.courseTop}>
                <View style={styles.courseLeft}>
                  <View style={styles.courseDot} />
                  <View>
                    <Text style={styles.courseName}>{course.name}</Text>
                    <Text style={styles.courseMeta}>{course.code}{course.professor ? ` · ${course.professor}` : ''}</Text>
                  </View>
                </View>
                {course.current_grade !== null ? (
                  <View style={styles.gradeWrap}>
                    <Text style={[styles.gradeText, { color: getGradeTextColor(course.current_grade) }]}>
                      {Math.round(course.current_grade)}%
                    </Text>
                    <Text style={styles.letterGrade}>{getLetterGrade(course.current_grade)}</Text>
                  </View>
                ) : (
                  <Text style={styles.noGrade}>No grades</Text>
                )}
              </View>

              {/* Progress bar */}
              <View style={styles.progressWrap}>
                <View style={[
                  styles.progressBar,
                  {
                    width: course.current_grade !== null ? `${Math.min(course.current_grade, 100)}%` : '0%',
                    backgroundColor: course.current_grade !== null ? getGradeBarColor(course.current_grade) : '#E9D5FF'
                  }
                ]} />
              </View>

              <View style={styles.courseFooter}>
                <Text style={styles.creditsText}>{course.credits} credits</Text>
                <Text style={styles.holdText}>Hold to delete</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add Course Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add a course</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm() }}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Course name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Calculus III" placeholderTextColor="#C4B5FD" value={name} onChangeText={setName} />

            <Text style={styles.label}>Course code</Text>
            <TextInput style={styles.input} placeholder="e.g. MATH 220" placeholderTextColor="#C4B5FD" value={code} onChangeText={setCode} autoCapitalize="characters" />

            <Text style={styles.label}>Professor</Text>
            <TextInput style={styles.input} placeholder="e.g. Dr. Smith" placeholderTextColor="#C4B5FD" value={professor} onChangeText={setProfessor} />

            <Text style={styles.label}>Credits</Text>
            <TextInput style={styles.input} placeholder="3" placeholderTextColor="#C4B5FD" value={credits} onChangeText={setCredits} keyboardType="number-pad" />

            <Text style={styles.label}>Semester</Text>
            <View style={styles.chipRow}>
              {TERMS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.termChip, semester === t && styles.termChipOn]}
                  onPress={() => {
                    setSemester(t)
                    // Switching term can leave a year that no longer applies.
                    const valid = yearsForTerm(t).map(String)
                    if (!valid.includes(year)) setYear(String(defaultYearFor(t)))
                  }}
                >
                  <Text style={[styles.termChipText, semester === t && styles.termChipTextOn]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Year</Text>
            <View style={styles.chipRow}>
              {yearsForTerm(semester).map(y => (
                <TouchableOpacity
                  key={y}
                  style={[styles.termChip, year === String(y) && styles.termChipOn]}
                  onPress={() => setYear(String(y))}
                >
                  <Text style={[styles.termChipText, year === String(y) && styles.termChipTextOn]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={addCourse} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add course</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <ProUpsellModal
        visible={showUpsell}
        reason="course_limit"
        onClose={() => setShowUpsell(false)}
        onPurchased={() => fetchCourses(true)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  termChip: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#EDE9FE', backgroundColor: '#F5F3FF', alignItems: 'center' },
  termChipOn: { borderColor: '#7C3AED', backgroundColor: '#EDE9FE' },
  termChipText: { fontSize: 15, fontWeight: '600', color: '#8E88A3' },
  termChipTextOn: { color: '#7C3AED' },
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1E1333' },
  sub: { fontSize: 14, color: '#A78BFA', marginTop: 2 },
  addBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E1333', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#A78BFA', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  courseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  courseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  courseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED' },
  courseName: { fontSize: 15, fontWeight: '600', color: '#1E1333' },
  courseMeta: { fontSize: 12, color: '#A78BFA', marginTop: 2 },
  gradeWrap: { alignItems: 'flex-end' },
  gradeText: { fontSize: 18, fontWeight: '700' },
  letterGrade: { fontSize: 12, color: '#9CA3AF' },
  noGrade: { fontSize: 12, color: '#C4B5FD' },
  progressWrap: { height: 6, backgroundColor: '#F5F3FF', borderRadius: 99, overflow: 'hidden', marginBottom: 10 },
  progressBar: { height: 6, borderRadius: 99 },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  creditsText: { fontSize: 11, color: '#A78BFA' },
  holdText: { fontSize: 11, color: '#DDD6FE' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: '#F5F3FF' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E1333' },
  modalClose: { fontSize: 16, color: '#7C3AED', fontWeight: '600' },
  modalBody: { padding: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#6D28D9', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16 },
  input: { backgroundColor: '#F5F3FF', borderWidth: 1.5, borderColor: '#DDD6FE', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E1333' },
  saveBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})

import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, ActivityIndicator
} from 'react-native'
import { supabase } from '../lib/supabase'

type Course = {
  id: string
  name: string
  course_code: string
  professor: string
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
  const [semester, setSemester] = useState('Fall 2026')

  useEffect(() => {
    fetchCourses()
  }, [])

  async function fetchCourses() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, course_code, professor, credits, current_grade')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setCourses(data)
    setLoading(false)
  }

  async function addCourse() {
    if (!name.trim()) return Alert.alert('Missing field', 'Please enter a course name.')
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('courses').insert({
      user_id: user.id,
      name: name.trim(),
      course_code: code.trim(),
      professor: professor.trim(),
      credits: parseInt(credits) || 3,
      semester: semester.trim(),
    })
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setModalVisible(false)
      resetForm()
      fetchCourses()
    }
    setSaving(false)
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
    setName(''); setCode(''); setProfessor(''); setCredits('3'); setSemester('Fall 2026')
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My courses</Text>
          <Text style={styles.sub}>{courses.length} course{courses.length !== 1 ? 's' : ''} this semester</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
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
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyBtnText}>+ Add a course</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {courses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onLongPress={() => deleteCourse(course.id)}
            >
              <View style={styles.courseTop}>
                <View style={styles.courseLeft}>
                  <View style={styles.courseDot} />
                  <View>
                    <Text style={styles.courseName}>{course.name}</Text>
                    <Text style={styles.courseMeta}>{course.course_code}{course.professor ? ` · ${course.professor}` : ''}</Text>
                  </View>
                </View>
                {course.current_grade !== null ? (
                  <View style={styles.gradeWrap}>
                    <Text style={[styles.gradeText, { color: getGradeColor(course.current_grade) }]}>
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
                    backgroundColor: course.current_grade !== null ? getGradeColor(course.current_grade) : '#E9D5FF'
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
            <TextInput style={styles.input} placeholder="Fall 2026" placeholderTextColor="#C4B5FD" value={semester} onChangeText={setSemester} />

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={addCourse} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add course</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
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

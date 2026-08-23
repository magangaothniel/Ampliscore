import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Alert, ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

type Rating = {
  id: string
  professor_name: string
  university: string
  course_code: string
  rating: number
  difficulty: number
  would_take_again: boolean
  review: string | null
  success_tips: string | null
  created_at: string
}

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={i <= Math.round(rating) ? '#F59E0B' : '#DDD6FE'}
        />
      ))}
    </View>
  )
}

const REPORT_REASONS: [string, string][] = [
  ['inaccurate', 'Inaccurate or misleading'],
  ['offensive', 'Offensive language'],
  ['harassment', 'Targets or harasses someone'],
  ['spam', 'Spam or advertising'],
  ['not_a_review', 'Not about the professor'],
  ['other', 'Something else'],
]

export default function ProfessorsScreen() {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  const [profName, setProfName] = useState('')
  const [university, setUniversity] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [rating, setRating] = useState(5)
  const [difficulty, setDifficulty] = useState(3)
  const [wouldTakeAgain, setWouldTakeAgain] = useState(true)
  const [review, setReview] = useState('')
  const [successTips, setSuccessTips] = useState('')

  const [reportTarget, setReportTarget] = useState<Rating | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  // Screens stay mounted under React Navigation, so a mount-only fetch
  // leaves stale numbers behind after edits on another tab. Refetch on
  // focus instead: on demand, and free when nobody is looking.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      fetchRatings(!firstFocus.current)
      firstFocus.current = false
    }, [])
  )

  async function fetchRatings(silent = false) {
    if (!silent) setLoading(true)
    // Web hides moderated reviews client-side; do it in the query here so
    // hidden rows never reach the device at all. Without this, reports get
    // actioned on web and the review still shows on mobile.
    const { data, error } = await supabase
      .from('professor_ratings')
      .select('*')
      .or('hidden.is.null,hidden.eq.false')
      .order('created_at', { ascending: false })
    if (error) console.error('RATINGS ERROR:', error.message)
    setRatings(data ?? [])
    setLoading(false)
  }

  async function submitRating() {
    if (!profName.trim()) return Alert.alert('Missing field', 'Please enter professor name.')
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('professor_ratings').insert({
      user_id: user.id,
      professor_name: profName.trim(),
      university: university.trim(),
      course_code: courseCode.trim(),
      rating,
      difficulty,
      would_take_again: wouldTakeAgain,
      review: review.trim(),
      success_tips: successTips.trim(),
    })
    if (error) Alert.alert('Error', error.message)
    else {
      setModalVisible(false)
      resetForm()
      fetchRatings()
    }
    setSaving(false)
  }

  async function submitReport() {
    if (!reportReason) return Alert.alert('Pick a reason', 'Please choose why you are reporting this review.')
    if (reportDetails.length > 1000) return Alert.alert('Too long', 'Details must be under 1000 characters.')
    if (!reportTarget) return
    setReportSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setReportSending(false)
        return Alert.alert('Signed out', 'Please sign in again.')
      }
      const res = await fetch('https://ampliscore.app/api/ratings/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          rating_id: reportTarget.id,
          reason: reportReason,
          details: reportDetails,
        }),
      })
      if (res.ok) {
        setReportDone(true)
      } else {
        const j = await res.json().catch(() => ({} as any))
        Alert.alert('Could not submit', j.error || 'Please try again.')
      }
    } catch (e: any) {
      Alert.alert('Network error', 'Could not reach the server. Check your connection.')
    } finally {
      setReportSending(false)
    }
  }

  function closeReport() {
    setReportTarget(null); setReportReason(''); setReportDetails(''); setReportDone(false)
  }

  function resetForm() {
    setProfName(''); setUniversity(''); setCourseCode('')
    setRating(5); setDifficulty(3); setWouldTakeAgain(true); setReview(''); setSuccessTips('')
  }

  const filtered = ratings.filter(r =>
    r.professor_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.university?.toLowerCase().includes(search.toLowerCase()) ||
    r.course_code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Professors</Text>
          <Text style={styles.sub}>{ratings.length} rating{ratings.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Rate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search professors or universities..."
          placeholderTextColor="#C4B5FD"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No ratings yet</Text>
          <Text style={styles.emptySub}>Be the first to rate a professor</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyBtnText}>+ Rate a professor</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {filtered.map(r => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profName}>{r.professor_name}</Text>
                  <Text style={styles.profMeta}>{r.university}{r.course_code ? ` · ${r.course_code}` : ''}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingNum}>{r.rating}.0</Text>
                </View>
              </View>
              <Stars rating={r.rating} />
              <View style={styles.tagsRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Difficulty: {r.difficulty}/5</Text>
                </View>
                {r.would_take_again && (
                  <View style={[styles.tag, styles.tagGreen]}>
                    <Text style={[styles.tagText, { color: '#16a34a' }]}>Would take again</Text>
                  </View>
                )}
              </View>
              {r.review ? <Text style={styles.comment}>{r.review}</Text> : null}
              {r.success_tips ? (
                <View style={styles.tipsBox}>
                  <Text style={styles.tipsLabel}>How to succeed</Text>
                  <Text style={styles.tipsText}>{r.success_tips}</Text>
                </View>
              ) : null}
              <TouchableOpacity style={styles.reportBtn} onPress={() => setReportTarget(r)}>
                <Ionicons name="flag-outline" size={13} color="#8E88A3" />
                <Text style={styles.reportBtnText}>Report</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate a professor</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm() }}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Professor name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Dr. Smith" placeholderTextColor="#C4B5FD" value={profName} onChangeText={setProfName} />

            <Text style={styles.label}>University</Text>
            <TextInput style={styles.input} placeholder="e.g. Kansas State University" placeholderTextColor="#C4B5FD" value={university} onChangeText={setUniversity} />

            <Text style={styles.label}>Course code</Text>
            <TextInput style={styles.input} placeholder="e.g. CS 101" placeholderTextColor="#C4B5FD" value={courseCode} onChangeText={setCourseCode} />

            <Text style={styles.label}>Overall rating</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} onPress={() => setRating(i)} style={[styles.ratingBtn, rating >= i && styles.ratingBtnActive]}>
                  <Text style={[styles.ratingBtnText, rating >= i && styles.ratingBtnTextActive]}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Difficulty (1-5)</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} onPress={() => setDifficulty(i)} style={[styles.ratingBtn, difficulty >= i && styles.ratingBtnActive]}>
                  <Text style={[styles.ratingBtnText, difficulty >= i && styles.ratingBtnTextActive]}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Would take again?</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity style={[styles.toggleBtn, wouldTakeAgain && styles.toggleBtnActive]} onPress={() => setWouldTakeAgain(true)}>
                <Text style={[styles.toggleText, wouldTakeAgain && styles.toggleTextActive]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, !wouldTakeAgain && styles.toggleBtnActive]} onPress={() => setWouldTakeAgain(false)}>
                <Text style={[styles.toggleText, !wouldTakeAgain && styles.toggleTextActive]}>No</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Review</Text>
            <TextInput style={[styles.input, styles.commentInput]} placeholder="Share your experience..." placeholderTextColor="#C4B5FD" value={review} onChangeText={setReview} multiline numberOfLines={4} />

            <Text style={styles.label}>How to succeed in this class</Text>
            <TextInput style={[styles.input, styles.commentInput]} placeholder="Tips for future students..." placeholderTextColor="#C4B5FD" value={successTips} onChangeText={setSuccessTips} multiline numberOfLines={3} />

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={submitRating} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Submit rating</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!reportTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeReport}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report this review</Text>
            <TouchableOpacity onPress={closeReport}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>

          {reportDone ? (
            <View style={styles.center}>
              <Ionicons name="checkmark-circle" size={44} color="#16a34a" />
              <Text style={styles.emptyTitle}>Report submitted</Text>
              <Text style={styles.emptySub}>Thanks. We'll review this shortly.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={closeReport}>
                <Text style={styles.emptyBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.sub}>Tell us what's wrong with it.</Text>

              <View style={{ marginTop: 16 }}>
                {REPORT_REASONS.map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.reasonRow, reportReason === value && styles.reasonRowActive]}
                    onPress={() => setReportReason(value)}
                  >
                    <Ionicons
                      name={reportReason === value ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={reportReason === value ? '#7C3AED' : '#C4B5FD'}
                    />
                    <Text style={[styles.reasonText, reportReason === value && styles.reasonTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Details (optional)</Text>
              <TextInput
                style={[styles.input, styles.commentInput]}
                placeholder="Anything else we should know?"
                placeholderTextColor="#C4B5FD"
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
              <Text style={styles.charCount}>{reportDetails.length}/1000</Text>

              <TouchableOpacity
                style={[styles.saveBtn, reportSending && { opacity: 0.6 }]}
                onPress={submitReport}
                disabled={reportSending}
              >
                {reportSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Submit report</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  tipsBox: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12, marginTop: 10 },
  tipsLabel: { fontSize: 11, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  tipsText: { fontSize: 14, color: '#5B5470', lineHeight: 20 },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 },
  reportBtnText: { fontSize: 12, color: '#8E88A3' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EDE9FE', marginBottom: 8 },
  reasonRowActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  reasonText: { fontSize: 14, color: '#5B5470' },
  reasonTextActive: { color: '#2E1065', fontWeight: '600' },
  charCount: { fontSize: 11, color: '#8E88A3', textAlign: 'right', marginTop: -8, marginBottom: 8 },
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#1E1333' },
  sub: { fontSize: 14, color: '#A78BFA', marginTop: 2 },
  addBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchWrap: { paddingHorizontal: 20, marginBottom: 8 },
  searchInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, color: '#1E1333', borderWidth: 1.5, borderColor: '#DDD6FE' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E1333', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#A78BFA', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  profName: { fontSize: 16, fontWeight: '700', color: '#1E1333' },
  profMeta: { fontSize: 12, color: '#A78BFA', marginTop: 2 },
  ratingBadge: { backgroundColor: '#F5F3FF', borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ratingNum: { fontSize: 16, fontWeight: '700', color: '#7C3AED' },
  tagsRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 },
  tag: { backgroundColor: '#F5F3FF', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  tagGreen: { backgroundColor: '#DCFCE7' },
  tagText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  comment: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginTop: 4 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: '#F5F3FF' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E1333' },
  modalClose: { fontSize: 16, color: '#7C3AED', fontWeight: '600' },
  modalBody: { padding: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#6D28D9', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16 },
  input: { backgroundColor: '#F5F3FF', borderWidth: 1.5, borderColor: '#DDD6FE', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E1333' },
  commentInput: { height: 100, textAlignVertical: 'top' },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F5F3FF', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD6FE' },
  ratingBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  ratingBtnText: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
  ratingBtnTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F5F3FF', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD6FE' },
  toggleBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  toggleText: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
  toggleTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})

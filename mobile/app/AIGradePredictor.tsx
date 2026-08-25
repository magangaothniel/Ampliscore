import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../lib/supabase'

const ENDPOINT = 'https://ampliscore.app/api/predict'
const UPGRADE = 'https://ampliscore.app/upgrade'

type Category = { id: string; name: string; weight: number }
type Assignment = {
  category_id: string | null
  grade: number | null
  max_grade: number | null
  completed: boolean
}
type Course = {
  name: string
  code: string | null
  professor: string | null
}

type Props = {
  course: Course
  categories: Category[]
  assignments: Assignment[]
}

export default function AIGradePredictor({ course, categories, assignments }: Props) {
  const [access, setAccess] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [targetGrade, setTargetGrade] = useState('90')
  const [limit, setLimit] = useState<{ used: number; cap: number } | null>(null)
  const [limitReached, setLimitReached] = useState(false)

  // Access is decided by the same two columns the endpoint checks, so the card
  // a student sees matches what the server will actually allow.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) { if (alive) setAccess(false); return }
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('is_pro, is_beta')
        .eq('id', auth.user.id)
        .single()
      if (!alive) return
      if (profileError || !data) { setAccess(false); return }
      setAccess(Boolean(data.is_pro) || Boolean(data.is_beta))
    })()
    return () => { alive = false }
  }, [])

  const run = async () => {
    setLoading(true)
    setResult('')
    setError('')
    setLimitReached(false)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Please log in again.')
      setLoading(false)
      return
    }

    const categoryData = categories.map(cat => {
      const done = assignments.filter(a => a.category_id === cat.id && a.completed)
      const earned = done.reduce((s, a) => s + (a.grade || 0), 0)
      const possible = done.reduce((s, a) => s + (a.max_grade || 100), 0)
      const incomplete = assignments.filter(a => a.category_id === cat.id && !a.completed)
      return {
        name: cat.name,
        weight: cat.weight,
        currentPct: possible > 0 ? (earned / possible) * 100 : null,
        completedCount: done.length,
        incompleteCount: incomplete.length,
      }
    })

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseName: course.name,
          courseCode: course.code || '',
          professor: course.professor || '',
          targetGrade,
          categories: categoryData,
        }),
      })

      const data = await res.json()

      if (res.status === 429 || data?.error === 'limit_reached') {
        setLimitReached(true)
        setLimit({ used: data?.used ?? 0, cap: data?.cap ?? 0 })
        setLoading(false)
        return
      }

      if (data?.error === 'upgrade_required') {
        setAccess(false)
        setLoading(false)
        return
      }

      if (!res.ok || data?.error) {
        // The endpoint returns a readable sentence for things a student can act
        // on, like an unconfirmed email. Anything else stays generic.
        setError(typeof data?.error === 'string' && data.error.includes(' ')
          ? data.error
          : 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      setResult(data?.content?.[0]?.text || 'Unable to generate prediction.')
      if (data?.predictions_used !== undefined) {
        setLimit({ used: data.predictions_used, cap: data.cap })
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    }
    setLoading(false)
  }

  if (access === null) return null

  if (!access) {
    return (
      <View style={styles.upsell}>
        <View style={styles.upsellHead}>
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.upsellTitle}>AI Grade Predictor</Text>
          <View style={styles.proTag}><Text style={styles.proTagText}>Pro</Text></View>
        </View>
        <Text style={styles.upsellBody}>
          See where this course is heading and exactly what you need to score on
          what is left to hit your target.
        </Text>
        <TouchableOpacity
          style={styles.upsellBtn}
          onPress={() => WebBrowser.openBrowserAsync(UPGRADE)}
        >
          <Text style={styles.upsellBtnText}>Upgrade to Pro · $4.99/mo</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const noCategories = categories.length === 0

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          const next = !open
          setOpen(next)
          if (next && !result && !noCategories) run()
        }}
      >
        <Ionicons name="sparkles" size={18} color="#7C3AED" />
        <Text style={styles.headerTitle}>AI Grade Predictor</Text>
        <View style={styles.proTagLight}><Text style={styles.proTagLightText}>Pro</Text></View>
        <View style={{ flex: 1 }} />
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#A78BFA"
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          {noCategories ? (
            <Text style={styles.empty}>
              Add grade categories from your syllabus first. The predictor works
              from their weights.
            </Text>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Target grade</Text>
                <TextInput
                  style={styles.input}
                  value={targetGrade}
                  onChangeText={setTargetGrade}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.pct}>%</Text>
                <TouchableOpacity
                  style={[styles.runBtn, (loading || limitReached) && styles.runBtnOff]}
                  onPress={run}
                  disabled={loading || limitReached}
                >
                  <Text style={styles.runBtnText}>
                    {loading ? 'Analyzing' : 'Recalculate'}
                  </Text>
                </TouchableOpacity>
              </View>

              {limit && !limitReached && (
                <Text style={styles.meta}>
                  {limit.used}/{limit.cap} predictions used this month
                </Text>
              )}

              {limitReached && (
                <View style={styles.warn}>
                  <Text style={styles.warnTitle}>Monthly limit reached</Text>
                  <Text style={styles.warnBody}>
                    You have used all {limit?.cap} predictions this month. The
                    count resets on the 1st.
                  </Text>
                </View>
              )}

              {loading && (
                <View style={styles.loading}>
                  <ActivityIndicator color="#7C3AED" />
                  <Text style={styles.loadingText}>Reading your grades</Text>
                </View>
              )}

              {error !== '' && !loading && (
                <View style={styles.warn}>
                  <Text style={styles.warnBody}>{error}</Text>
                </View>
              )}

              {result !== '' && !loading && (
                <View style={styles.result}>
                  <Text style={styles.resultText}>{result}</Text>
                  <Text style={styles.resultMeta}>
                    Powered by Claude · Based on the grades you have entered
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  proTagLight: {
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proTagLightText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F3FF',
    paddingTop: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  input: {
    width: 60,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    textAlign: 'center',
    color: '#1F2937',
  },
  pct: { fontSize: 14, color: '#6B7280' },
  runBtn: {
    marginLeft: 'auto',
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  runBtnOff: { opacity: 0.5 },
  runBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 12 },
  empty: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: { fontSize: 14, color: '#6B7280' },
  result: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14, marginTop: 14 },
  resultText: { fontSize: 14, color: '#1F2937', lineHeight: 21 },
  resultMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 12 },
  warn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  warnTitle: { fontSize: 14, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  warnBody: { fontSize: 13, color: '#B45309', lineHeight: 19 },
  upsell: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  upsellHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  upsellTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  proTag: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proTagText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  upsellBody: { fontSize: 14, color: '#EDE9FE', lineHeight: 20, marginBottom: 14 },
  upsellBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  upsellBtnText: { color: '#6D28D9', fontSize: 14, fontWeight: '600' },
})

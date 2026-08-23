import { useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { BADGES } from '../lib/achievements'

/**
 * Every badge, earned ones in colour and the rest greyed out.
 *
 * Showing the locked ones is the point. A student who sees only what they have
 * already earned learns nothing about what to aim for, and the effort-based
 * badges are the ones that reward entering data, which is what makes the
 * grade predictions accurate in the first place.
 */
export default function BadgesScreen({ navigation }: any) {
  const [earned, setEarned] = useState<Set<string>>(new Set())
  const [dates, setDates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      fetchEarned(!firstFocus.current)
      firstFocus.current = false
    }, [])
  )

  async function fetchEarned(silent = false) {
    if (!silent) setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('achievements')
        .select('code, earned_at')
        .eq('user_id', user.id)

      // Checked explicitly: a null from a failed query would otherwise look
      // identical to a student who has earned nothing.
      if (error) {
        console.error('ACHIEVEMENTS ERROR:', error.message)
        return
      }

      setEarned(new Set((data ?? []).map((r: any) => r.code)))
      setDates(
        Object.fromEntries((data ?? []).map((r: any) => [r.code, r.earned_at]))
      )
    } finally {
      setLoading(false)
    }
  }

  function earnedOn(code: string): string | null {
    const raw = dates[code]
    if (!raw) return null
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    )
  }

  const count = earned.size

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#7C3AED" />
        </TouchableOpacity>
        <Text style={styles.title}>Badges</Text>
        <Text style={styles.subtitle}>
          {count} of {BADGES.length} earned
        </Text>
      </View>

      <View style={styles.list}>
        {BADGES.map(badge => {
          const has = earned.has(badge.code)
          const when = earnedOn(badge.code)
          return (
            <View
              key={badge.code}
              style={[styles.card, has ? styles.cardEarned : styles.cardLocked]}
            >
              <Text style={[styles.icon, !has && styles.iconLocked]}>{badge.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, !has && styles.nameLocked]}>{badge.name}</Text>
                <Text style={styles.desc}>{badge.description}</Text>
                {has && when ? <Text style={styles.when}>Earned {when}</Text> : null}
              </View>
              {has ? (
                <Ionicons name="checkmark-circle" size={22} color="#7C3AED" />
              ) : (
                <Ionicons name="lock-closed" size={18} color="#C4B5FD" />
              )}
            </View>
          )
        })}
      </View>

      <Text style={styles.footnote}>
        Streaks and comebacks only count from when badges launched, so they start
        fresh even if you have been using Ampliscore a while.
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  backBtn: { marginBottom: 8, width: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#1E1333' },
  subtitle: { fontSize: 14, color: '#A78BFA', marginTop: 4 },
  list: { paddingHorizontal: 20, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  cardEarned: { backgroundColor: '#fff', borderColor: '#DDD6FE' },
  cardLocked: { backgroundColor: '#FAF9FF', borderColor: '#EDE9FE', opacity: 0.75 },
  icon: { fontSize: 28 },
  iconLocked: { opacity: 0.4 },
  name: { fontSize: 15, fontWeight: '700', color: '#1E1333', marginBottom: 2 },
  nameLocked: { color: '#6B6480' },
  desc: { fontSize: 13, color: '#8E88A3', lineHeight: 18 },
  when: { fontSize: 12, color: '#7C3AED', fontWeight: '600', marginTop: 4 },
  footnote: {
    fontSize: 12,
    color: '#A78BFA',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginTop: 20,
  },
})

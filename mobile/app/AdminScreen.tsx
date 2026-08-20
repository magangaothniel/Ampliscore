import type React from 'react'
import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

// Everything here is served by /api/admin, which re-checks is_admin server-side
// against the service role on every request. Hiding the tab is a convenience,
// not the security boundary.
const ENDPOINT = 'https://ampliscore.app/api/admin'

export default function AdminScreen() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function token() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function load() {
    try {
      const t = await token()
      if (!t) { setDenied(true); return }
      const res = await fetch(ENDPOINT, { headers: { Authorization: `Bearer ${t}` } })
      if (res.status === 403) { setDenied(true); return }
      if (res.ok) setData(await res.json())
    } catch {
      Alert.alert('Network error', 'Could not reach the server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function act(action: string, id: string, extra: Record<string, any> = {}) {
    setBusy(id)
    try {
      const t = await token()
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ action, id, ...extra }),
      })
      if (!res.ok) Alert.alert('Could not update', 'Please try again.')
    } catch {
      Alert.alert('Network error', 'Could not reach the server.')
    } finally {
      setBusy(null)
      load()
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
  }

  if (denied) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={34} color="#C4B5FD" />
        <Text style={styles.deniedText}>Not authorised.</Text>
      </View>
    )
  }

  if (!data) return null
  const d = data
  const s = d.stats
  const needsAction = d.support.length + d.openReports.length + d.openErrors.length

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
          tintColor="#7C3AED"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.sub}>Pull down to refresh</Text>
      </View>

      <View style={styles.statGrid}>
        <Stat label="Users" value={s.users} sub={`${s.newUsers} new this week`} />
        <Stat label="Pro" value={s.pro} sub={`$${s.mrr} MRR`} accent />
        <Stat label="Waitlist" value={s.waitlist} />
        <Stat label="Beta" value={s.betaTesters} />
        <Stat label="Courses" value={s.courses} />
        <Stat label="Assignments" value={s.assignments} />
        <Stat label="Ratings" value={s.ratings} />
        <Stat label="Needs action" value={needsAction} alert={needsAction > 0} />
      </View>

      <Section title={`Support (${d.support.length})`}>
        {d.support.length === 0 ? <Empty>Nothing waiting.</Empty> : d.support.map((r: any) => (
          <Row key={r.id}>
            <View style={{ flex: 1 }}>
              {r.concerning ? (
                <View style={styles.warnTag}><Text style={styles.warnTagText}>Check in</Text></View>
              ) : null}
              <Text style={styles.meta}>
                {r.type} · {r.platform || 'unknown'} · {new Date(r.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.body}>{r.message}</Text>
              <Text style={styles.meta}>{r.email}</Text>
            </View>
            <Action busy={busy === r.id} onPress={() => act('resolve_support', r.id)}>Resolve</Action>
          </Row>
        ))}
      </Section>

      <Section title={`Rating reports (${d.openReports.length})`}>
        {d.openReports.length === 0 ? <Empty>No open reports.</Empty> : d.openReports.map((r: any) => (
          <Row key={r.id}>
            <View style={{ flex: 1 }}>
              <View style={styles.reasonTag}><Text style={styles.reasonTagText}>{r.reason}</Text></View>
              {r.details ? <Text style={styles.body}>{r.details}</Text> : null}
              {r.rating ? (
                <View style={styles.quote}>
                  <Text style={styles.meta}>
                    {r.rating.professor_name}
                    {r.rating.course_code ? ` · ${r.rating.course_code}` : ''}
                  </Text>
                  {r.rating.review ? <Text style={styles.body}>{r.rating.review}</Text> : null}
                </View>
              ) : (
                <Text style={styles.meta}>Review not found.</Text>
              )}
              <View style={styles.actionRow}>
                <Action busy={busy === r.id} danger onPress={() => act('hide_rating', r.id, { rating_id: r.rating_id })}>
                  Hide review
                </Action>
                <Action busy={busy === r.id} onPress={() => act('dismiss_report', r.id)}>Dismiss</Action>
              </View>
            </View>
          </Row>
        ))}
      </Section>

      <Section title={`Open errors (${d.openErrors.length})`}>
        {d.openErrors.length === 0 ? <Empty>Nothing broken that we know of.</Empty> : d.openErrors.map((e: any) => (
          <Row key={e.id}>
            <View style={{ flex: 1 }}>
              <Text style={styles.body}>{e.message}</Text>
              <Text style={styles.meta}>{e.where_at} · {e.source} · {e.occurrences}x</Text>
            </View>
            <Action busy={busy === e.id} onPress={() => act('resolve_error', e.id)}>Resolve</Action>
          </Row>
        ))}
      </Section>
    </ScrollView>
  )
}

function Stat({ label, value, sub, accent, alert }: any) {
  return (
    <View style={[styles.statCard, alert && styles.statAlert]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: '#7C3AED' }]}>{value ?? '—'}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  )
}

function Section({ title, children }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  )
}

function Row({ children }: any) {
  return <View style={styles.row}>{children}</View>
}

function Empty({ children }: any) {
  return <Text style={styles.empty}>{children}</Text>
}

function Action({ children, onPress, busy, danger }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      style={[styles.actionBtn, danger && styles.actionDanger, busy && { opacity: 0.5 }]}
    >
      <Text style={[styles.actionText, danger && styles.actionTextDanger]}>{busy ? '…' : children}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF', gap: 10 },
  deniedText: { fontSize: 15, color: '#8E88A3' },

  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14 },
  title: { fontSize: 26, fontWeight: '700', color: '#1E1333' },
  sub: { fontSize: 13, color: '#A78BFA', marginTop: 2 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#EDE9FE' },
  statAlert: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  statLabel: { fontSize: 11, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '700' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1E1333', marginTop: 3 },
  statSub: { fontSize: 11, color: '#A78BFA', marginTop: 1 },

  section: { marginTop: 26 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E1333', paddingHorizontal: 20, marginBottom: 9 },
  card: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F3FF' },
  empty: { fontSize: 14, color: '#A78BFA', padding: 16 },

  meta: { fontSize: 11.5, color: '#A78BFA', marginTop: 2 },
  body: { fontSize: 14, color: '#1E1333', marginTop: 3, lineHeight: 19 },
  quote: { backgroundColor: '#F5F3FF', borderRadius: 10, padding: 10, marginTop: 8 },

  warnTag: { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 3 },
  warnTagText: { fontSize: 10, fontWeight: '800', color: '#A8500A', textTransform: 'uppercase' },
  reasonTag: { alignSelf: 'flex-start', backgroundColor: '#FEE2E2', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  reasonTagText: { fontSize: 10, fontWeight: '800', color: '#BE1B1B', textTransform: 'uppercase' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { borderWidth: 1, borderColor: '#EDE9FE', borderRadius: 9, paddingVertical: 6, paddingHorizontal: 11 },
  actionDanger: { borderColor: '#FECACA' },
  actionText: { fontSize: 12, color: '#5B5470', fontWeight: '600' },
  actionTextDanger: { color: '#BE1B1B' },
})

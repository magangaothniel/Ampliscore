import type React from 'react'
import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

export default function NotificationsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailsEnabled, setEmailsEnabled] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('profiles').select('emails_enabled').eq('id', user.id).single()
      if (error) console.error('PROFILE ERROR:', error.message)
      // Null means never opted out, which is opted in.
      setEmailsEnabled(data?.emails_enabled !== false)
    } finally {
      setLoading(false)
    }
  }

  async function toggle(value: boolean) {
    const previous = emailsEnabled
    setEmailsEnabled(value)
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase
        .from('profiles').update({ emails_enabled: value }).eq('id', user.id)
      if (error) {
        setEmailsEnabled(previous)
        Alert.alert('Error', error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#7C3AED" />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Notifications</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 14 }}>
              <Text style={styles.rowTitle}>Weekly summary email</Text>
              <Text style={styles.rowSub}>
                A rundown of where your grades stand and what's due, once a week.
              </Text>
            </View>
            <Switch
              value={emailsEnabled}
              onValueChange={toggle}
              disabled={saving}
              trackColor={{ true: '#7C3AED', false: '#DDD6FE' }}
            />
          </View>
        </View>

        <Text style={styles.note}>
          Account emails like password resets and receipts are always sent, since
          they're needed to run your account.
        </Text>

        <View style={styles.soonCard}>
          <Ionicons name="notifications-outline" size={17} color="#A78BFA" />
          <Text style={styles.soonText}>
            Push notifications for upcoming due dates aren't built yet. When they
            are, the controls will live here.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, color: '#7C3AED', fontWeight: '600', marginLeft: -2 },

  body: { padding: 20, paddingTop: 8, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#1E1333', marginBottom: 20 },

  card: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowTitle: { fontSize: 15.5, fontWeight: '600', color: '#1E1333' },
  rowSub: { fontSize: 13, color: '#8E88A3', marginTop: 3, lineHeight: 18 },

  note: { fontSize: 12.5, color: '#A78BFA', lineHeight: 18, marginTop: 14, paddingHorizontal: 2 },

  soonCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#EDE9FE', borderRadius: 14, padding: 14, marginTop: 24 },
  soonText: { flex: 1, fontSize: 13, color: '#5B5470', lineHeight: 19 },
})

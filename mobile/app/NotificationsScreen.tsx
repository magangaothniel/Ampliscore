import { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import {
  isPushSupported, isDeviceRegistered, registerForPush,
  unregisterPush, canAskForPush,
} from '../lib/notifications'

export default function NotificationsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPush, setSavingPush] = useState(false)
  const [digestEnabled, setDigestEnabled] = useState(true)
  const [pushOn, setPushOn] = useState(false)

  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      load(!firstFocus.current)
      firstFocus.current = false
    }, [])
  )

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // The column is `digest_enabled`. This screen previously read
      // `emails_enabled`, which lives on `beta_testers`, not `profiles` — so
      // the toggle never actually saved anything.
      const { data, error } = await supabase
        .from('profiles').select('digest_enabled').eq('id', user.id).single()
      if (error) console.error('PROFILE ERROR:', error.message)

      // Null means never opted out, which is opted in.
      setDigestEnabled(data?.digest_enabled !== false)
      setPushOn(await isDeviceRegistered())
    } finally {
      setLoading(false)
    }
  }

  async function toggleDigest(value: boolean) {
    const previous = digestEnabled
    setDigestEnabled(value)
    setSavingEmail(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase
        .from('profiles').update({ digest_enabled: value }).eq('id', user.id)
      if (error) {
        setDigestEnabled(previous)
        Alert.alert('Could not save', error.message)
      }
    } finally {
      setSavingEmail(false)
    }
  }

  async function togglePush(value: boolean) {
    setSavingPush(true)
    try {
      if (!value) {
        // OS permission can't be revoked from here, so "off" means dropping the
        // token. Nothing gets sent to a device with no token.
        await unregisterPush()
        setPushOn(false)
        return
      }

      const ok = await registerForPush()
      setPushOn(ok)

      if (!ok) {
        // Distinguish "never asked" from "asked and denied", because only the
        // second one needs a trip to Settings.
        const canAsk = await canAskForPush()
        Alert.alert(
          'Notifications are off',
          canAsk
            ? 'Ampliscore could not turn on notifications. Please try again.'
            : 'Notifications are turned off for Ampliscore in iOS Settings. You can turn them back on there.',
          canAsk
            ? [{ text: 'OK' }]
            : [
                { text: 'Not now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
        )
      }
    } finally {
      setSavingPush(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
  }

  const pushSupported = isPushSupported()

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

        <Text style={styles.sectionLabel}>ON THIS PHONE</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 14 }}>
              <Text style={styles.rowTitle}>Push notifications</Text>
              <Text style={styles.rowSub}>
                {pushSupported
                  ? 'Badges you earn, and reminders about what is due.'
                  : 'Update to the latest version of the app to turn these on.'}
              </Text>
            </View>
            <Switch
              value={pushOn}
              onValueChange={togglePush}
              disabled={savingPush || !pushSupported}
              trackColor={{ true: '#7C3AED', false: '#DDD6FE' }}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>BY EMAIL</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 14 }}>
              <Text style={styles.rowTitle}>Weekly summary</Text>
              <Text style={styles.rowSub}>
                A rundown of where your grades stand and what's due, once a week.
              </Text>
            </View>
            <Switch
              value={digestEnabled}
              onValueChange={toggleDigest}
              disabled={savingEmail}
              trackColor={{ true: '#7C3AED', false: '#DDD6FE' }}
            />
          </View>
        </View>

        <Text style={styles.note}>
          Account emails like password resets and receipts are always sent, since
          they're needed to run your account.
        </Text>
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

  sectionLabel: { fontSize: 11.5, fontWeight: '700', color: '#A78BFA', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowTitle: { fontSize: 15.5, fontWeight: '600', color: '#1E1333' },
  rowSub: { fontSize: 13, color: '#8E88A3', marginTop: 3, lineHeight: 18 },

  note: { fontSize: 12.5, color: '#A78BFA', lineHeight: 18, paddingHorizontal: 2 },
})

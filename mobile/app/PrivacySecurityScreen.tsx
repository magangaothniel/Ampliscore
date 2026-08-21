import type React from 'react'
import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../lib/supabase'

const WEB = 'https://ampliscore.app'

type BillingDisclosure = {
  hasActiveSubscription: boolean
  amount: string | null
  interval: string | null
  unknown: boolean
}

export default function PrivacySecurityScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [termsAt, setTermsAt] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)

  const [portalBusy, setPortalBusy] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [billing, setBilling] = useState<BillingDisclosure | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('profiles').select('is_pro, terms_accepted_at').eq('id', user.id).single()
      if (error) console.error('PROFILE ERROR:', error.message)
      setIsPro(!!data?.is_pro)
      setTermsAt(data?.terms_accepted_at ?? null)
    } finally {
      setLoading(false)
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      return Alert.alert("Passwords don't match", 'Please enter the same password twice.')
    }
    if (newPassword.length < 8) {
      return Alert.alert('Too short', 'Password must be at least 8 characters.')
    }
    setChanging(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return Alert.alert('Error', error.message)
      setNewPassword(''); setConfirmPassword('')
      Alert.alert('Password updated')
    } finally {
      setChanging(false)
    }
  }

  async function manageSubscription() {
    setPortalBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return Alert.alert('Signed out', 'Please sign in again.')
      }
      const res = await fetch(`${WEB}/api/stripe/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json().catch(() => ({} as any))
      if (json.url) {
        WebBrowser.openBrowserAsync(json.url)
      } else {
        Alert.alert('Could not open billing', json.error || 'Please contact support.')
      }
    } catch {
      Alert.alert('Network error', 'Could not reach the server.')
    } finally {
      setPortalBusy(false)
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  // `is_pro` is not the same as paying. Beta testers are granted Pro without a
  // subscription, so asking Stripe is the only way to avoid warning them about
  // a charge that doesn't exist.
  useEffect(() => {
    if (!deleteOpen) return
    setBilling(null)
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch(`${WEB}/api/account/delete`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) setBilling(await res.json())
      } catch {
        // Leave it null and fall back to wording that claims nothing.
      }
    })()
  }, [deleteOpen])

  async function deleteAccount() {
    if (deleteText !== 'DELETE') return
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setDeleting(false)
        return Alert.alert('Signed out', 'Please sign in again.')
      }
      const res = await fetch(`${WEB}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (res.ok) {
        setDeleteOpen(false)
        // Signing out unmounts this screen and returns to login.
        await supabase.auth.signOut()
      } else {
        const j = await res.json().catch(() => ({} as any))
        Alert.alert('Could not delete', j.error || 'Please try again or contact support.')
      }
    } catch {
      Alert.alert('Network error', 'Could not reach the server.')
    } finally {
      setDeleting(false)
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

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Privacy &amp; security</Text>

        <Text style={styles.sectionLabel}>Change password</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#C4B5FD"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Confirm new password"
            placeholderTextColor="#C4B5FD"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.primaryBtn, changing && { opacity: 0.6 }]}
            onPress={changePassword}
            disabled={changing}
          >
            {changing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Update password</Text>}
          </TouchableOpacity>
          <Text style={styles.hint}>
            If you signed up with Google, setting a password lets you sign in either way.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.planRow}>
            <View>
              <Text style={styles.planName}>{isPro ? 'Pro plan' : 'Free plan'}</Text>
              <Text style={styles.planSub}>{isPro ? '$4.99/month · billed monthly' : 'Up to 4 courses'}</Text>
            </View>
            {!isPro ? (
              <TouchableOpacity style={styles.upgradeBtn} onPress={() => WebBrowser.openBrowserAsync(`${WEB}/upgrade`)}>
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {isPro ? (
            <>
              <Text style={styles.hint}>
                Cancel any time. Pro access continues until the end of the period you've paid for.
              </Text>
              <TouchableOpacity
                style={[styles.secondaryBtn, portalBusy && { opacity: 0.6 }]}
                onPress={manageSubscription}
                disabled={portalBusy}
              >
                {portalBusy
                  ? <ActivityIndicator color="#7C3AED" />
                  : <Text style={styles.secondaryBtnText}>Manage or cancel subscription</Text>}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Legal</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} onPress={() => WebBrowser.openBrowserAsync(`${WEB}/terms`)}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="open-outline" size={16} color="#A78BFA" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkDivider]} onPress={() => WebBrowser.openBrowserAsync(`${WEB}/privacy`)}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color="#A78BFA" />
          </TouchableOpacity>
          {termsAt ? (
            <View style={[styles.linkRow, styles.linkDivider]}>
              <Text style={styles.linkMuted}>Terms accepted</Text>
              <Text style={styles.linkMuted}>{new Date(termsAt).toLocaleDateString()}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={confirmSignOut}>
            <Text style={styles.secondaryBtnText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: '#BE1B1B' }]}>Close account</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Your data belongs to you. Closing your account permanently deletes your
            courses, grades, ratings, and profile. This cannot be undone.
          </Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={() => { setDeleteText(''); setDeleteOpen(true) }}>
            <Text style={styles.dangerBtnText}>Delete my account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={deleteOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delete account</Text>
            <TouchableOpacity onPress={() => setDeleteOpen(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.body2}>
              This permanently deletes your courses, assignments, grades, professor
              ratings, and profile. It cannot be undone.
            </Text>
            {billing?.hasActiveSubscription ? (
              <Text style={styles.warnText}>
                Your Pro subscription will be cancelled. You are paying $
                {billing.amount} per {billing.interval === 'year' ? 'year' : 'month'}.
                Deleting your account cancels it immediately, so you will not be
                charged again. The rest of the period you have already paid for is
                not refunded.
              </Text>
            ) : null}
            {billing?.unknown ? (
              <Text style={styles.warnText}>
                We could not reach Stripe to check your billing status. If you have
                Pro, it will still be cancelled as part of deleting your account.
              </Text>
            ) : null}
            <Text style={styles.label}>Type DELETE to confirm</Text>
            <TextInput
              style={styles.input}
              value={deleteText}
              onChangeText={setDeleteText}
              placeholder="DELETE"
              placeholderTextColor="#C4B5FD"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.dangerBtn, (deleteText !== 'DELETE' || deleting) && { opacity: 0.5 }]}
              onPress={deleteAccount}
              disabled={deleteText !== 'DELETE' || deleting}
            >
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerBtnText}>Permanently delete</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  title: { fontSize: 26, fontWeight: '700', color: '#1E1333' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 26, marginBottom: 9 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },

  input: { backgroundColor: '#F5F3FF', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13, fontSize: 16, color: '#1E1333', borderWidth: 1, borderColor: '#EDE9FE' },
  label: { fontSize: 12, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 22, marginBottom: 7 },
  hint: { fontSize: 12.5, color: '#8E88A3', lineHeight: 18, marginTop: 12 },

  primaryBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  secondaryBtnText: { color: '#7C3AED', fontSize: 15, fontWeight: '600' },
  dangerBtn: { backgroundColor: '#BE1B1B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  dangerBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: 15.5, fontWeight: '600', color: '#1E1333' },
  planSub: { fontSize: 12.5, color: '#8E88A3', marginTop: 2 },
  upgradeBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 15 },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  linkDivider: { borderTopWidth: 1, borderTopColor: '#F5F3FF' },
  linkText: { fontSize: 15, color: '#1E1333' },
  linkMuted: { fontSize: 13.5, color: '#8E88A3' },

  modal: { flex: 1, backgroundColor: '#F5F3FF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E1333' },
  modalClose: { fontSize: 16, color: '#7C3AED', fontWeight: '600' },
  modalBody: { padding: 20, paddingTop: 4, paddingBottom: 48 },
  body2: { fontSize: 15, color: '#1E1333', lineHeight: 22 },
  warnText: { fontSize: 13.5, color: '#A8500A', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginTop: 16, lineHeight: 19 },
})

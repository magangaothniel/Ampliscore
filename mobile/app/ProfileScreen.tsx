import { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Share } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { avatarColor, avatarInitials } from '../lib/avatar'
import { restorePro } from '../lib/purchases'
import ProUpsellModal from './ProUpsellModal'

type Profile = {
  full_name: string | null
  avatar_url: string | null
  is_pro: boolean
  referral_code: string | null
  referral_count: number
}

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [badgeCount, setBadgeCount] = useState(0)
  const [upsellVisible, setUpsellVisible] = useState(false)
  const [restoring, setRestoring] = useState(false)

  // Screens stay mounted under React Navigation, so a mount-only fetch
  // leaves stale numbers behind after edits on another tab. Refetch on
  // focus instead: on demand, and free when nobody is looking.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      fetchProfile(!firstFocus.current)
      firstFocus.current = false
    }, [])
  )

  async function fetchProfile(silent = false) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || '')
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    // `if (data)` alone silently swallows a null when the query fails, which
    // makes a broken query look like an empty profile.
    if (error) console.error('PROFILE ERROR:', error.message)
    else if (data) setProfile(data)

    // Count only; the shelf itself loads the detail when opened.
    const { count } = await supabase
      .from('achievements')
      .select('code', { count: 'exact', head: true })
      .eq('user_id', user.id)
    setBadgeCount(count ?? 0)
    setLoading(false)
  }

  // Apple requires a restore path that works without a purchase flow, for
  // users reinstalling or moving to a new device.
  async function handleRestore() {
    setRestoring(true)
    const result = await restorePro()
    setRestoring(false)
    if (result.status === 'purchased') {
      await fetchProfile(true)
      Alert.alert('Pro restored', 'Your subscription is active on this device.')
    } else if (result.status === 'error') {
      Alert.alert('Nothing to restore', result.message)
    }
  }

  async function manageSubscription() {
    await WebBrowser.openBrowserAsync('https://apps.apple.com/account/subscriptions')
  }

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() }
    ])
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  )

  const WEB = 'https://ampliscore.app'

  // Kept for non-purchase web links (support, legal). Upgrade flows go
  // through the native paywall now — never a browser.
  function openWeb(path: string) {
    WebBrowser.openBrowserAsync(`${WEB}${path}`)
  }

  function openSupport() {
    navigation.navigate('Support')
  }

  const shortCode = profile?.referral_code ? profile.referral_code.slice(0, 8).toUpperCase() : '—'

  async function shareReferralCode() {
    if (!profile?.referral_code) return
    try {
      await Share.share({
        message: `Track your GPA with Ampliscore. Use my code ${shortCode} when you sign up: https://ampliscore.app`,
      })
    } catch (e) {
      // user cancelled the share sheet; nothing to do
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor(profile) }]}>
            <Text style={styles.avatarText}>{avatarInitials(profile, email)}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.full_name || 'Student'}</Text>
        <Text style={styles.emailText}>{email}</Text>
        {profile?.is_pro ? (
          <View style={styles.proBadge}><Text style={styles.proBadgeText}>✦ Pro</Text></View>
        ) : (
          <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>Free plan</Text></View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{profile?.referral_count || 0}</Text>
          <Text style={styles.statLabel}>Referrals</Text>
        </View>
        <View style={styles.statCard}>
          <TouchableOpacity onPress={shareReferralCode} disabled={!profile?.referral_code}>
              <Text style={styles.statVal}>{shortCode}</Text>
              {profile?.referral_code ? <Text style={styles.copyHint}>Tap to share</Text> : null}
            </TouchableOpacity>
          <Text style={styles.statLabel}>Referral code</Text>
        </View>
      </View>

      {!profile?.is_pro && (
        <TouchableOpacity style={styles.upgradeBanner} onPress={() => setUpsellVisible(true)}>
          <Text style={styles.upgradeTitle}>✦ Upgrade to Pro</Text>
          <Text style={styles.upgradeSub}>AI grade predictor, unlimited courses & more</Text>
          <Text style={styles.upgradePrice}>$4.99/month</Text>
        </TouchableOpacity>
      )}

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="person-outline" size={20} color="#7C3AED" style={styles.menuIcon} />
          <Text style={styles.menuLabel}>Edit profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#C4B5FD" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Badges')}>
          <Ionicons name="ribbon-outline" size={20} color="#7C3AED" style={styles.menuIcon} />
          <Text style={styles.menuLabel}>Badges</Text>
          {badgeCount > 0 ? <Text style={styles.menuCount}>{badgeCount}</Text> : null}
          <Ionicons name="chevron-forward" size={18} color="#C4B5FD" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={20} color="#7C3AED" style={styles.menuIcon} />
          <Text style={styles.menuLabel}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#C4B5FD" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PrivacySecurity')}>
          <Ionicons name="lock-closed-outline" size={20} color="#7C3AED" style={styles.menuIcon} />
          <Text style={styles.menuLabel}>Privacy & security</Text>
          <Ionicons name="chevron-forward" size={18} color="#C4B5FD" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={openSupport}>
          <Ionicons name="help-circle-outline" size={20} color="#7C3AED" style={styles.menuIcon} />
          <Text style={styles.menuLabel}>Help & support</Text>
          <Ionicons name="chevron-forward" size={18} color="#C4B5FD" />
        </TouchableOpacity>
        {profile?.is_pro ? (
          <TouchableOpacity style={styles.menuItem} onPress={manageSubscription}>
            <Ionicons name="card-outline" size={20} color="#7C3AED" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Manage subscription</Text>
            <Ionicons name="chevron-forward" size={18} color="#C4B5FD" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomWidth: 0 }]}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Ionicons name="refresh-outline" size={20} color="#7C3AED" style={styles.menuIcon} />
          <Text style={styles.menuLabel}>Restore purchases</Text>
          {restoring
            ? <ActivityIndicator size="small" color="#7C3AED" />
            : <Ionicons name="chevron-forward" size={18} color="#C4B5FD" />}
        </TouchableOpacity>
      </View>

      <ProUpsellModal
        visible={upsellVisible}
        reason="intro"
        onClose={() => setUpsellVisible(false)}
        onPurchased={() => fetchProfile(true)}
      />

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  copyHint: { fontSize: 11, color: '#A78BFA', marginTop: 2, textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#1E1333' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, backgroundColor: '#EDE9FE' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#1E1333', marginBottom: 4 },
  emailText: { fontSize: 14, color: '#A78BFA', marginBottom: 10 },
  proBadge: { backgroundColor: '#7C3AED', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 14 },
  proBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  freeBadge: { backgroundColor: '#EDE9FE', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 14 },
  freeBadgeText: { color: '#7C3AED', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statVal: { fontSize: 20, fontWeight: '700', color: '#7C3AED', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#A78BFA' },
  upgradeBanner: { marginHorizontal: 20, backgroundColor: '#7C3AED', borderRadius: 16, padding: 20, marginBottom: 20 },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  upgradeSub: { fontSize: 13, color: '#DDD6FE', marginBottom: 8 },
  upgradePrice: { fontSize: 15, fontWeight: '700', color: '#fff' },
  menu: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F3FF' },
  menuIcon: { marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: '#1E1333', fontWeight: '500' },
  menuCount: { fontSize: 13, color: '#7C3AED', fontWeight: '700', marginRight: 8 },
  signOutBtn: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FCA5A5' },
  signOutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
})

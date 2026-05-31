import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'

type Profile = {
  full_name: string | null
  email: string | null
  is_pro: boolean
  referral_code: string | null
  referral_count: number
  avatar_url: string | null
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || '')
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() }
    ])
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  )

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || email.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Student'}</Text>
        <Text style={styles.emailText}>{email}</Text>
        {profile?.is_pro ? (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>✦ Pro</Text>
          </View>
        ) : (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>Free plan</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{profile?.referral_count || 0}</Text>
          <Text style={styles.statLabel}>Referrals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{profile?.referral_code || '—'}</Text>
          <Text style={styles.statLabel}>Referral code</Text>
        </View>
      </View>

      {/* Upgrade banner */}
      {!profile?.is_pro && (
        <View style={styles.upgradeBanner}>
          <Text style={styles.upgradeTitle}>✦ Upgrade to Pro</Text>
          <Text style={styles.upgradeSub}>AI grade predictor, unlimited courses & more</Text>
          <Text style={styles.upgradePrice}>$4.99/month</Text>
        </View>
      )}

      {/* Menu items */}
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>👤</Text>
          <Text style={styles.menuLabel}>Edit profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔒</Text>
          <Text style={styles.menuLabel}>Privacy & security</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={styles.menuLabel}>Help & support</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#1E1333' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
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
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: '#1E1333', fontWeight: '500' },
  menuArrow: { fontSize: 20, color: '#C4B5FD' },
  signOutBtn: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FCA5A5' },
  signOutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
})

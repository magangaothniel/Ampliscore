import type React from 'react'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { PurchasesPackage } from 'react-native-purchases'
import { getProPackage, purchasePro, restorePro, purchasesAvailable } from '../lib/purchases'

const { width } = Dimensions.get('window')

const PERKS: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'infinite', text: 'Unlimited courses' },
  { icon: 'sparkles', text: '50 AI grade predictions a month' },
  { icon: 'calendar', text: 'Schedule import and due date tracking' },
  { icon: 'trending-up', text: 'Full semester planning' },
]

// `reason` drives the headline. Wall prompts name the limit the user just hit,
// which converts better than a generic pitch.
export type UpsellReason = 'course_limit' | 'ai_limit' | 'intro'

const HEADLINES: Record<UpsellReason, { title: string; sub: string }> = {
  course_limit: {
    title: "You've hit 4 courses",
    sub: 'The free plan tracks up to 4 classes. Go Pro to add your whole schedule.',
  },
  ai_limit: {
    title: 'AI predictions are a Pro feature',
    sub: 'Get 50 grade predictions a month, plus everything else below.',
  },
  intro: {
    title: 'Get the most out of Ampliscore',
    sub: 'Pro unlocks your full schedule and AI grade predictions.',
  },
}

export default function ProUpsellModal({
  visible,
  reason = 'intro',
  onClose,
  onPurchased,
}: {
  visible: boolean
  reason?: UpsellReason
  onClose: () => void
  onPurchased?: () => void
}) {
  const copy = HEADLINES[reason]
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null)
  const [busy, setBusy] = useState(false)

  // Offerings are fetched per-open rather than once at mount so a user who
  // buys, refunds, or changes storefront mid-session sees the right price.
  useEffect(() => {
    if (!visible) return
    let active = true
    getProPackage().then(p => { if (active) setPkg(p) })
    return () => { active = false }
  }, [visible])

  // Falls back to the hardcoded price until StoreKit answers, so the paywall
  // never renders a blank price row.
  const priceLabel = pkg?.product.priceString ?? '$4.99'

  async function handleUpgrade() {
    if (!purchasesAvailable()) {
      Alert.alert('Not available', 'In-app purchases are not available on this device yet.')
      return
    }
    if (!pkg) {
      Alert.alert('One moment', 'Still loading pricing from the App Store. Try again in a second.')
      return
    }

    setBusy(true)
    const result = await purchasePro(pkg)
    setBusy(false)

    if (result.status === 'purchased') {
      onPurchased?.()
      onClose()
      Alert.alert('You’re Pro', 'Unlimited courses and AI predictions are unlocked.')
    } else if (result.status === 'error') {
      Alert.alert('Purchase failed', result.message)
    }
    // 'cancelled' is silent — the user closed the Apple sheet on purpose.
  }

  async function handleRestore() {
    setBusy(true)
    const result = await restorePro()
    setBusy(false)

    if (result.status === 'purchased') {
      onPurchased?.()
      onClose()
      Alert.alert('Pro restored', 'Your subscription is active again on this device.')
    } else if (result.status === 'error') {
      Alert.alert('Nothing to restore', result.message)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color="#8E88A3" />
          </TouchableOpacity>

          <View style={styles.badge}>
            <Ionicons name="sparkles" size={13} color="#7C3AED" />
            <Text style={styles.badgeText}>Ampliscore Pro</Text>
          </View>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.sub}>{copy.sub}</Text>

          <View style={styles.perks}>
            {PERKS.map(p => (
              <View key={p.text} style={styles.perkRow}>
                <Ionicons name={p.icon} size={17} color="#7C3AED" />
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceLabel}</Text>
            <Text style={styles.per}>/month</Text>
          </View>
          <Text style={styles.cancel}>
            Auto-renews monthly. Cancel anytime in your Apple ID settings.
          </Text>

          <TouchableOpacity
            style={[styles.cta, busy && styles.ctaDisabled]}
            onPress={handleUpgrade}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>Upgrade to Pro</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestore} disabled={busy} style={styles.restore}>
            <Text style={styles.restoreText}>Restore purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} disabled={busy} style={styles.later}>
            <Text style={styles.laterText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,19,51,0.55)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 26, paddingBottom: 38, width: '100%', maxWidth: width },
  close: { position: 'absolute', top: 18, right: 18, zIndex: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#F5F3FF', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 14 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  title: { fontSize: 24, fontWeight: '700', color: '#1E1333', marginBottom: 8 },
  sub: { fontSize: 15, lineHeight: 21, color: '#5B5470', marginBottom: 22 },
  perks: { gap: 13, marginBottom: 24 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  perkText: { fontSize: 15, color: '#2E1065' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 30, fontWeight: '700', color: '#1E1333' },
  per: { fontSize: 15, color: '#8E88A3' },
  cancel: { fontSize: 13, color: '#8E88A3', marginTop: 2, marginBottom: 20 },
  cta: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  restore: { alignItems: 'center', paddingTop: 14 },
  restoreText: { fontSize: 14, color: '#7C3AED', fontWeight: '600' },
  later: { alignItems: 'center', paddingTop: 10 },
  laterText: { fontSize: 15, color: '#8E88A3' },
})

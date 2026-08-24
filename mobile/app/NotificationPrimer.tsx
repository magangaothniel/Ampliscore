import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { registerForPush } from '../lib/notifications'
import { BADGES } from '../lib/achievements'

/**
 * Asks for notification permission the right way round.
 *
 * iOS shows its permission dialog exactly once per install. If a student taps
 * "Don't Allow" there, the only way back is the Settings app, which almost
 * nobody does. So this screen goes first: it explains what the notifications
 * are actually for, and only calls the OS prompt once they've said yes here.
 * Saying "Not now" costs nothing, because we can ask again another day.
 */
export default function NotificationPrimer({
  visible,
  onDone,
}: {
  visible: boolean
  onDone: (granted: boolean) => void
}) {
  const [working, setWorking] = useState(false)

  async function handleAllow() {
    setWorking(true)
    // This is what triggers the real iOS dialog.
    const granted = await registerForPush()
    setWorking(false)
    onDone(granted)
  }

  // The three badges shown as examples. First Grade In is excluded because
  // most students have already earned it by the time they see this.
  const preview = BADGES.filter(b => b.code !== 'first_blood').slice(0, 3)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onDone(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.bell}>
            <Ionicons name="notifications" size={26} color="#7C3AED" />
          </View>

          <Text style={styles.title}>Know sooner</Text>
          <Text style={styles.sub}>
            Ampliscore can tell you the moment something changes, so you're not
            checking the app to find out.
          </Text>

          <View style={styles.reasons}>
            <Reason icon="trophy-outline" text="When you earn a badge" />
            <Reason icon="calendar-outline" text="When something is due tomorrow" />
            <Reason icon="trending-down-outline" text="When a grade drops below your target" />
          </View>

          <View style={styles.badgeStrip}>
            {preview.map(b => (
              <View key={b.code} style={styles.badgeChip}>
                <Text style={styles.badgeIcon}>{b.icon}</Text>
                <Text style={styles.badgeName} numberOfLines={1}>{b.name}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primary, working && styles.primaryBusy]}
            onPress={handleAllow}
            disabled={working}
          >
            {working
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryText}>Turn on notifications</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onDone(false)} disabled={working} style={styles.secondary}>
            <Text style={styles.secondaryText}>Not now</Text>
          </TouchableOpacity>

          <Text style={styles.footnote}>
            You can change this any time in Profile, under Notifications.
          </Text>
        </View>
      </View>
    </Modal>
  )
}

function Reason({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.reasonRow}>
      <Ionicons name={icon} size={17} color="#7C3AED" style={{ width: 24 }} />
      <Text style={styles.reasonText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,19,51,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },

  bell: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 21, fontWeight: '700', color: '#1E1333', marginBottom: 6 },
  sub: { fontSize: 14, color: '#8E88A3', textAlign: 'center', lineHeight: 20, marginBottom: 18 },

  reasons: { alignSelf: 'stretch', gap: 11, marginBottom: 18 },
  reasonRow: { flexDirection: 'row', alignItems: 'center' },
  reasonText: { flex: 1, fontSize: 14, color: '#1E1333' },

  badgeStrip: { flexDirection: 'row', gap: 8, marginBottom: 22, alignSelf: 'stretch' },
  badgeChip: { flex: 1, backgroundColor: '#F5F3FF', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  badgeIcon: { fontSize: 20, marginBottom: 3 },
  badgeName: { fontSize: 10.5, fontWeight: '600', color: '#5B5470', textAlign: 'center' },

  primary: { alignSelf: 'stretch', backgroundColor: '#7C3AED', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryBusy: { opacity: 0.7 },
  primaryText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },

  secondary: { paddingVertical: 14 },
  secondaryText: { color: '#8E88A3', fontSize: 14.5, fontWeight: '600' },

  footnote: { fontSize: 11.5, color: '#A78BFA', textAlign: 'center' },
})

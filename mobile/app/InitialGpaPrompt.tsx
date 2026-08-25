import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { isValidPriorGpa, isValidPriorCredits } from '../lib/gpa'

/**
 * Asks for the GPA the student is carrying into this semester.
 *
 * Without it, the number on the dashboard is only this semester's GPA, which
 * for anyone past their first term is not the GPA they actually have. That
 * makes "know where you stand" wrong in the one place it matters most.
 *
 * Skipping is a real answer, not a delay. `gpa_prompt_seen` is set either way,
 * so this never reappears; the student can add it later from Edit profile.
 * GPA and credits are required together, because a GPA with no credit count
 * can't be weighted against the current semester.
 */
export default function InitialGpaPrompt({
  visible,
  onDone,
}: {
  visible: boolean
  onDone: () => void
}) {
  const [gpa, setGpa] = useState('')
  const [credits, setCredits] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const gpaOk = isValidPriorGpa(gpa)
  const creditsOk = isValidPriorCredits(credits)
  const canSave = gpaOk && creditsOk

  async function markSeen(extra: Record<string, any> = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('profiles')
      .update({ gpa_prompt_seen: true, ...extra })
      .eq('id', user.id)
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      await markSeen({ prior_gpa: Number(gpa), prior_credits: Number(credits) })
      onDone()
    } catch {
      setError('Could not save that. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSkip() {
    setSaving(true)
    try {
      await markSeen()
    } catch {
      // Not worth blocking them over. Worst case it asks once more.
    } finally {
      setSaving(false)
      onDone()
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="school-outline" size={26} color="#7C3AED" />
          </View>

          <Text style={styles.title}>What's your GPA right now?</Text>
          <Text style={styles.sub}>
            Ampliscore blends this with your current classes, so the number you
            see is your real GPA and not just this semester's.
          </Text>

          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.label}>CURRENT GPA</Text>
              <TextInput
                value={gpa}
                onChangeText={setGpa}
                placeholder="3.42"
                placeholderTextColor="#C4B5FD"
                keyboardType="decimal-pad"
                style={[styles.input, gpa !== '' && !gpaOk && styles.inputBad]}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>CREDITS EARNED</Text>
              <TextInput
                value={credits}
                onChangeText={setCredits}
                placeholder="45"
                placeholderTextColor="#C4B5FD"
                keyboardType="number-pad"
                style={[styles.input, credits !== '' && !creditsOk && styles.inputBad]}
              />
            </View>
          </View>

          <Text style={styles.hint}>
            Both are on your transcript or student portal. They're needed
            together, since credits are what weight the GPA.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primary, !canSave && styles.primaryOff]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryText}>Save</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} disabled={saving} style={styles.secondary}>
            <Text style={styles.secondaryText}>I don't know it yet</Text>
          </TouchableOpacity>

          <Text style={styles.footnote}>
            You can add it any time from Profile, under Edit profile.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,19,51,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },

  iconWrap: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E1333', marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 14, color: '#8E88A3', textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  fields: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  field: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 0.6, marginBottom: 6 },
  input: { backgroundColor: '#F5F3FF', borderRadius: 12, borderWidth: 1.5, borderColor: '#EDE9FE', paddingHorizontal: 14, height: 48, fontSize: 16, color: '#1E1333' },
  inputBad: { borderColor: '#FCA5A5' },

  hint: { fontSize: 12, color: '#A78BFA', lineHeight: 17, marginTop: 10, marginBottom: 18, alignSelf: 'stretch' },
  error: { fontSize: 13, color: '#dc2626', marginBottom: 12 },

  primary: { alignSelf: 'stretch', backgroundColor: '#7C3AED', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryOff: { opacity: 0.35 },
  primaryText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },

  secondary: { paddingVertical: 14 },
  secondaryText: { color: '#8E88A3', fontSize: 14.5, fontWeight: '600' },

  footnote: { fontSize: 11.5, color: '#A78BFA', textAlign: 'center' },
})

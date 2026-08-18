import type React from 'react'
import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'

const TYPES: [string, string][] = [
  ['bug', 'Something is broken'],
  ['question', 'I have a question'],
  ['billing', 'Billing or my plan'],
  ['other', 'Something else'],
]

// Mirrors the web /help page. Keep the wording in step if either changes.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Why doesn't my grade match Canvas?",
    a: 'Ampliscore only knows what you have entered. If something has been graded that you have not added, or a category weight does not match your syllabus, the numbers will differ. Open the course and check that your weights add up to 100% and every graded assignment is in there.',
  },
  {
    q: 'How do grade categories work?',
    a: 'Most syllabi split your grade into buckets, like homework 20%, midterms 40%, final 40%. Add each bucket as a category with its weight, then file assignments under it. Within a category we total points earned against points possible, then weight that by the category percentage.',
  },
  {
    q: 'What counts toward the 4 course limit?',
    a: 'Every course you are currently tracking. Deleting a course frees a slot. Assignments and categories are unlimited on both plans.',
  },
  {
    q: 'Are professor ratings anonymous?',
    a: 'Your name is never shown on a rating. We do store which account submitted it so we can act on reports and stop abuse.',
  },
  {
    q: 'How do I cancel Pro?',
    a: 'Open Settings on the web app and use the billing portal. You keep Pro until the end of the period you already paid for.',
  },
]

export default function SupportScreen({ navigation }: any) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [type, setType] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!type) return Alert.alert('Pick a topic', 'Let us know what your message is about.')
    if (message.trim().length < 10) {
      return Alert.alert('Add a little more', 'Tell us what happened so we can actually help.')
    }

    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSending(false)
        return Alert.alert('Signed out', 'Please sign in again.')
      }

      const res = await fetch('https://ampliscore.app/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type,
          message,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          app_version: Constants.expoConfig?.version ?? null,
        }),
      })

      if (res.ok) {
        setSent(true)
      } else {
        const j = await res.json().catch(() => ({} as any))
        Alert.alert('Could not send', j.error || 'Please try again.')
      }
    } catch {
      Alert.alert('Network error', 'Could not reach the server. Check your connection.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#7C3AED" />
            <Text style={styles.backText}>Profile</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={46} color="#10B981" />
          <Text style={styles.sentTitle}>Message sent</Text>
          <Text style={styles.sentSub}>We read every one of these. You'll hear back at your account email.</Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => { setSent(false); setType(''); setMessage('') }}
          >
            <Text style={styles.secondaryBtnText}>Send another</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
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
        <Text style={styles.title}>Help &amp; support</Text>
        <Text style={styles.intro}>Common questions first. If yours isn't here, send us a message.</Text>

        <Text style={styles.sectionLabel}>Frequently asked</Text>
        <View style={styles.faqCard}>
          {FAQS.map((f, i) => (
            <View key={f.q} style={i > 0 ? styles.faqDivider : undefined}>
              <TouchableOpacity style={styles.faqRow} onPress={() => setOpenFaq(openFaq === i ? null : i)}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <Ionicons
                  name={openFaq === i ? 'remove' : 'add'}
                  size={18}
                  color="#7C3AED"
                />
              </TouchableOpacity>
              {openFaq === i ? <Text style={styles.faqA}>{f.a}</Text> : null}
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Still stuck?</Text>

        <Text style={styles.label}>What's this about?</Text>
        <View style={styles.chipWrap}>
          {TYPES.map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, type === value && styles.chipActive]}
              onPress={() => setType(value)}
            >
              <Text style={[styles.chipText, type === value && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Your message</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="What happened, and what were you trying to do?"
          placeholderTextColor="#C4B5FD"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{message.length}/2000</Text>

        <TouchableOpacity
          style={[styles.saveBtn, sending && { opacity: 0.6 }]}
          onPress={submit}
          disabled={sending}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Send message</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, color: '#7C3AED', fontWeight: '600', marginLeft: -2 },

  body: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#1E1333' },
  intro: { fontSize: 14, color: '#A78BFA', marginTop: 4, lineHeight: 20 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 28, marginBottom: 10 },

  faqCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  faqDivider: { borderTopWidth: 1, borderTopColor: '#F5F3FF' },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 15, paddingHorizontal: 16 },
  faqQ: { flex: 1, fontSize: 14.5, fontWeight: '600', color: '#1E1333' },
  faqA: { fontSize: 14, color: '#5B5470', lineHeight: 21, paddingHorizontal: 16, paddingBottom: 16, marginTop: -2 },

  label: { fontSize: 12, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 18 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 99, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#fff', paddingVertical: 9, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { fontSize: 13.5, color: '#5B5470' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, color: '#1E1333', borderWidth: 1, borderColor: '#EDE9FE' },
  textarea: { minHeight: 140 },
  counter: { fontSize: 11, color: '#8E88A3', textAlign: 'right', marginTop: 6 },

  saveBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 22 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  sentTitle: { fontSize: 19, fontWeight: '700', color: '#1E1333', marginTop: 14 },
  sentSub: { fontSize: 14, color: '#5B5470', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  secondaryBtn: { marginTop: 22, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#fff' },
  secondaryBtnText: { fontSize: 15, color: '#7C3AED', fontWeight: '600' },
})

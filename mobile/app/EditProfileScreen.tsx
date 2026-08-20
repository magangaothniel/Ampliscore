import type React from 'react'
import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../lib/supabase'

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']

export default function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, university, major, year_of_study, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) console.error('PROFILE ERROR:', error.message)
      if (data) {
        setFullName(data.full_name ?? '')
        setUniversity(data.university ?? '')
        setMajor(data.major ?? '')
        setYear(data.year_of_study ?? '')
        setAvatarUrl(data.avatar_url ?? null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!fullName.trim()) return Alert.alert('Missing name', 'Please enter your name.')
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim(),
        university: university.trim(),
        major: major.trim(),
        year_of_study: year || null,
      }).eq('id', user.id)

      if (error) return Alert.alert('Error', error.message)
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
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

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Edit profile</Text>

        <View style={styles.avatarRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(fullName || email).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.avatarNote}>
              Photo uploads aren't in the app yet. You can change it on the web for now.
            </Text>
            <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync('https://ampliscore.app/profile')}>
              <Text style={styles.avatarLink}>Change photo on web</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="#C4B5FD" />

        <Text style={styles.label}>Email</Text>
        <View style={[styles.input, styles.readonly]}>
          <Text style={styles.readonlyText}>{email}</Text>
        </View>
        <Text style={styles.hint}>Email is tied to how you sign in and can't be changed here.</Text>

        <Text style={styles.label}>University</Text>
        <TextInput style={styles.input} value={university} onChangeText={setUniversity} placeholder="Kansas State University" placeholderTextColor="#C4B5FD" />

        <Text style={styles.label}>Major</Text>
        <TextInput style={styles.input} value={major} onChangeText={setMajor} placeholder="Computer Science" placeholderTextColor="#C4B5FD" />

        <Text style={styles.label}>Year</Text>
        <View style={styles.chipWrap}>
          {YEARS.map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.chip, year === y && styles.chipActive]}
              onPress={() => setYear(year === y ? '' : y)}
            >
              <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
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

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#EDE9FE' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  avatarNote: { fontSize: 12.5, color: '#8E88A3', lineHeight: 18 },
  avatarLink: { fontSize: 13, color: '#7C3AED', fontWeight: '600', marginTop: 5 },

  label: { fontSize: 12, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7, marginTop: 20 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, color: '#1E1333', borderWidth: 1, borderColor: '#EDE9FE' },
  readonly: { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' },
  readonlyText: { fontSize: 16, color: '#6B6480' },
  hint: { fontSize: 12, color: '#A78BFA', marginTop: 6, lineHeight: 17 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 99, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#fff', paddingVertical: 9, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { fontSize: 13.5, color: '#5B5470' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  saveBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})

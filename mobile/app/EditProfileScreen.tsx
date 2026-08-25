import type React from 'react'
import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { AVATAR_COLORS, avatarColor, avatarInitials } from '../lib/avatar'
import { pickAndUploadAvatar, removeAvatar } from '../lib/avatarPhoto'
import { isValidPriorGpa, isValidPriorCredits } from '../lib/gpa'

// year_of_study is an integer column, 1 through 5. Store the number, show the
// label. Sending the label is what produced "invalid input syntax for type
// integer".
const YEARS: { value: number; label: string }[] = [
  { value: 1, label: 'Freshman' },
  { value: 2, label: 'Sophomore' },
  { value: 3, label: 'Junior' },
  { value: 4, label: 'Senior' },
  { value: 5, label: 'Graduate' },
]

export default function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarHue, setAvatarHue] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [priorGpa, setPriorGpa] = useState('')
  const [priorCredits, setPriorCredits] = useState('')
  const [email, setEmail] = useState('')

  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, university, major, year_of_study, avatar_url, avatar_color, prior_gpa, prior_credits')
        .eq('id', user.id)
        .single()

      if (error) console.error('PROFILE ERROR:', error.message)
      if (data) {
        setFullName(data.full_name ?? '')
        setUniversity(data.university ?? '')
        setMajor(data.major ?? '')
        setYear(data.year_of_study ?? null)
        setAvatarUrl(data.avatar_url ?? null)
        setAvatarHue((data as any).avatar_color ?? null)
        const pg = (data as any).prior_gpa
        const pc = (data as any).prior_credits
        setPriorGpa(pg === null || pg === undefined ? '' : String(pg))
        setPriorCredits(pc === null || pc === undefined ? '' : String(pc))
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
        year_of_study: year,
        avatar_color: avatarHue,
        prior_gpa: bothPriorFieldsValid ? Number(priorGpa) : null,
        prior_credits: bothPriorFieldsValid ? Number(priorCredits) : null,
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

  // Empty is a valid state: it means "not provided", which clears both.
  const bothPriorBlank = priorGpa.trim() === '' && priorCredits.trim() === ''
  const bothPriorFieldsValid = isValidPriorGpa(priorGpa) && isValidPriorCredits(priorCredits)
  const priorFieldsOk = bothPriorBlank || bothPriorFieldsValid

  async function handleChangePhoto() {
    setPhotoBusy(true)
    const res = await pickAndUploadAvatar()
    setPhotoBusy(false)
    if (res.ok) setAvatarUrl(res.url)
    // Backing out of the picker is a normal action, so stay quiet.
    else if (!res.cancelled) Alert.alert('Could not update photo', res.message)
  }

  async function handleRemovePhoto() {
    Alert.alert('Remove photo?', 'Your avatar goes back to a colour with your initials.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setPhotoBusy(true)
          const res = await removeAvatar()
          setPhotoBusy(false)
          if (res.ok) setAvatarUrl(null)
          else Alert.alert('Could not remove photo', res.message ?? 'Please try again.')
        },
      },
    ])
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
            <View style={[styles.avatar, { backgroundColor: avatarColor({ avatar_color: avatarHue }) }]}>
              <Text style={styles.avatarText}>
                {avatarInitials({ full_name: fullName }, email)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={handleChangePhoto}
              disabled={photoBusy}
              style={[styles.photoBtn, photoBusy && styles.photoBtnDisabled]}
            >
              {photoBusy
                ? <ActivityIndicator color="#7C3AED" />
                : <Text style={styles.photoBtnText}>{avatarUrl ? 'Change photo' : 'Add photo'}</Text>}
            </TouchableOpacity>
            {avatarUrl ? (
              <TouchableOpacity onPress={handleRemovePhoto} disabled={photoBusy}>
                <Text style={styles.avatarLink}>Remove photo</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.avatarNote}>JPG, PNG or WebP. Saved right away.</Text>
            )}
          </View>
        </View>

        {!avatarUrl ? (
          <View style={styles.hueCard}>
            <Text style={styles.hueTitle}>Avatar colour</Text>
            <View style={styles.hueRow}>
              {AVATAR_COLORS.map(c => {
                const active = avatarColor({ avatar_color: avatarHue }) === c
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setAvatarHue(c)}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${c} avatar`}
                    style={[styles.hue, { backgroundColor: c }, active && styles.hueActive]}
                  />
                )
              })}
            </View>
            <Text style={styles.avatarNote}>Saved when you tap Save.</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="#C4B5FD" />

        <Text style={styles.label}>Email</Text>
        <View style={[styles.input, styles.readonly]}>
          <Text style={styles.readonlyText}>{email}</Text>
        </View>
        <Text style={styles.hint}>
          Email is tied to how you sign in. To change it, visit www.ampliscore.app on the web.
        </Text>

        <Text style={styles.label}>University</Text>
        <TextInput style={styles.input} value={university} onChangeText={setUniversity} placeholder="Kansas State University" placeholderTextColor="#C4B5FD" />

        <Text style={styles.label}>Major</Text>
        <TextInput style={styles.input} value={major} onChangeText={setMajor} placeholder="Computer Science" placeholderTextColor="#C4B5FD" />

        <Text style={styles.label}>Year</Text>
        <View style={styles.chipWrap}>
          {YEARS.map(y => (
            <TouchableOpacity
              key={y.value}
              style={[styles.chip, year === y.value && styles.chipActive]}
              onPress={() => setYear(year === y.value ? null : y.value)}
            >
              <Text style={[styles.chipText, year === y.value && styles.chipTextActive]}>{y.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Starting GPA</Text>
        <Text style={styles.fieldNote}>
          What you were carrying into this semester. Ampliscore blends it with
          your current classes so the GPA on your dashboard is your real one.
          Leave both blank if you'd rather not.
        </Text>
        <View style={styles.gpaRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>GPA</Text>
            <TextInput
              value={priorGpa}
              onChangeText={setPriorGpa}
              placeholder="3.42"
              placeholderTextColor="#C4B5FD"
              keyboardType="decimal-pad"
              style={[styles.input, priorGpa !== '' && !isValidPriorGpa(priorGpa) && styles.inputBad]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>Credits earned</Text>
            <TextInput
              value={priorCredits}
              onChangeText={setPriorCredits}
              placeholder="45"
              placeholderTextColor="#C4B5FD"
              keyboardType="number-pad"
              style={[styles.input, priorCredits !== '' && !isValidPriorCredits(priorCredits) && styles.inputBad]}
            />
          </View>
        </View>
        {!priorFieldsOk ? (
          <Text style={styles.fieldError}>
            GPA and credits are needed together. Credits are what weight the GPA.
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, (saving || !priorFieldsOk) && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving || !priorFieldsOk}
        >
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
  photoBtn: { borderWidth: 1.5, borderColor: '#DDD6FE', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  photoBtnDisabled: { opacity: 0.5 },
  photoBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 14 },
  hueCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 12 },
  hueTitle: { fontSize: 14, fontWeight: '600', color: '#1E1333', marginBottom: 10 },
  hueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  hue: { width: 34, height: 34, borderRadius: 17 },
  hueActive: { borderWidth: 3, borderColor: '#1E1333' },
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

  fieldNote: { fontSize: 12.5, color: '#8E88A3', lineHeight: 18, marginBottom: 10, marginTop: -4 },
  subLabel: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 0.5, marginBottom: 5 },
  gpaRow: { flexDirection: 'row', gap: 12 },
  inputBad: { borderColor: '#FCA5A5' },
  fieldError: { fontSize: 12.5, color: '#dc2626', marginTop: 8 },
  saveBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})

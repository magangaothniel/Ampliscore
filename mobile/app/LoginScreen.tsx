import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from '../lib/supabase'

WebBrowser.maybeCompleteAuthSession()

type Tab = 'email' | 'phone' | 'google'

export default function LoginScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function signInEmail() {
    if (!email || !password) return Alert.alert('Missing fields', 'Please enter your email and password.')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Sign in failed', error.message)
    setLoading(false)
  }

  async function sendOtp() {
    const cleaned = phone.replace(/\s/g, '')
    if (!cleaned) return Alert.alert('Enter your phone number', 'Include country code e.g. +12025551234')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: cleaned })
    if (error) Alert.alert('Failed to send code', error.message)
    else setOtpSent(true)
    setLoading(false)
  }

  async function verifyOtp() {
    if (!otp || otp.length < 4) return Alert.alert('Enter the code', 'Check your SMS.')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/\s/g, ''),
      token: otp,
      type: 'sms',
    })
    if (error) Alert.alert('Verification failed', error.message)
    setLoading(false)
  }

  async function signInWithGoogle() {
    setLoading(true)
    try {
      const redirectTo = Linking.createURL('auth/callback')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })
      if (error) throw error
      if (!data.url) throw new Error('No OAuth URL')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

      if (result.type === 'success' && result.url) {
        const url = result.url
        // Parse tokens from hash or query params
        const hashPart = url.split('#')[1] || ''
        const queryPart = url.split('?')[1]?.split('#')[0] || ''
        const hash = new URLSearchParams(hashPart)
        const query = new URLSearchParams(queryPart)
        const access_token = hash.get('access_token') || query.get('access_token')
        const refresh_token = hash.get('refresh_token') || query.get('refresh_token')

        if (access_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token ?? '',
          })
          if (sessionError) throw sessionError
        } else {
          Alert.alert('Sign in incomplete', 'Could not retrieve session. Please try again.')
        }
      }
    } catch (e: any) {
      Alert.alert('Google sign in failed', e.message)
    }
    setLoading(false)
  }

  return (
    <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <View style={styles.logoMark}>
              <View style={styles.outerRing} />
              <View style={styles.innerDot} />
            </View>
            <Text style={styles.wordmark}>
              <Text style={styles.ampli}>ampli</Text>
              <Text style={styles.score}>score</Text>
            </Text>
            <Text style={styles.tagline}>KNOW WHERE YOU STAND</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.sub}>Sign in to your account</Text>

            <View style={styles.tabRow}>
              {(['email', 'phone', 'google'] as Tab[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                  onPress={() => { setTab(t); setOtpSent(false) }}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                    {t === 'email' ? '✉️ Email' : t === 'phone' ? '📱 Phone' : 'G  Google'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'email' && (
              <View>
                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} placeholder="you@university.edu" placeholderTextColor="#C4B5FD" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                <Text style={styles.label}>Password</Text>
                <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#C4B5FD" value={password} onChangeText={setPassword} secureTextEntry />
                <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={signInEmail} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
                </TouchableOpacity>
              </View>
            )}

            {tab === 'phone' && (
              <View>
                {!otpSent ? (
                  <>
                    <Text style={styles.label}>Phone number</Text>
                    <TextInput style={styles.input} placeholder="+1 202 555 1234" placeholderTextColor="#C4B5FD" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                    <Text style={styles.hint}>Include country code e.g. +1 for US</Text>
                    <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={sendOtp} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send code</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.otpInfo}>Code sent to {phone} 📲</Text>
                    <Text style={styles.label}>Verification code</Text>
                    <TextInput style={[styles.input, styles.otpInput]} placeholder="123456" placeholderTextColor="#C4B5FD" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                    <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={verifyOtp} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & sign in</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setOtpSent(false)} style={styles.resendBtn}>
                      <Text style={styles.resendText}>Wrong number? Go back</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {tab === 'google' && (
              <View style={styles.googleWrap}>
                <Text style={styles.googleSub}>Sign in with your Google account. No password needed.</Text>
                <TouchableOpacity style={[styles.googleBtn, loading && styles.btnDisabled]} onPress={signInWithGoogle} disabled={loading}>
                  {loading ? <ActivityIndicator color="#1E1333" /> : <Text style={styles.googleBtnText}>G  Continue with Google</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? <Text style={styles.footerLink}>Sign up free</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', alignItems: 'stretch', paddingHorizontal: 24, paddingVertical: 60 },
  logoWrap: { alignItems: 'center', marginBottom: 36, width: '100%' },
  logoMark: { width: 56, height: 56, backgroundColor: '#EDE9FE', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#DDD6FE' },
  outerRing: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2.5, borderColor: '#7C3AED' },
  innerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED' },
  wordmark: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' },
  ampli: { color: '#1E1333' },
  score: { color: '#7C3AED' },
  tagline: { fontSize: 10, color: '#A78BFA', letterSpacing: 3, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  heading: { fontSize: 22, fontWeight: '700', color: '#1E1333', marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 14, color: '#A78BFA', marginBottom: 20, textAlign: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 11, color: '#A78BFA', fontWeight: '600' },
  tabTextActive: { color: '#7C3AED' },
  label: { fontSize: 12, fontWeight: '600', color: '#6D28D9', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F5F3FF', borderWidth: 1.5, borderColor: '#DDD6FE', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 15, color: '#1E1333' },
  btn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  hint: { fontSize: 12, color: '#A78BFA', marginBottom: 16, marginTop: -10 },
  otpInfo: { fontSize: 14, color: '#7C3AED', fontWeight: '600', textAlign: 'center', marginBottom: 16, backgroundColor: '#F5F3FF', padding: 12, borderRadius: 10 },
  otpInput: { fontSize: 24, textAlign: 'center', letterSpacing: 8, fontWeight: '700' },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { color: '#A78BFA', fontSize: 13 },
  googleWrap: { alignItems: 'center', paddingVertical: 8 },
  googleSub: { fontSize: 13, color: '#A78BFA', textAlign: 'center', marginBottom: 20 },
  googleBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', width: '100%', borderWidth: 1.5, borderColor: '#DDD6FE' },
  googleBtnText: { color: '#1E1333', fontWeight: '600', fontSize: 15 },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { color: '#6B7280', fontSize: 14 },
  footerLink: { color: '#7C3AED', fontWeight: '600' },
})

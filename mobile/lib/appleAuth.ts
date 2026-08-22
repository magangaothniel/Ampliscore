import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import { supabase } from './supabase'

/**
 * Sign in with Apple.
 *
 * The critical detail: Apple returns the user's name ONLY on the very first
 * authorization for this Apple ID and app, and never again. Not on the next
 * sign in, not after deleting and reinstalling, not after signing out. If it
 * isn't captured in that one moment it is gone permanently and the student is
 * stuck as an initial-less avatar forever.
 *
 * The email behaves differently: if they choose "Hide My Email", Apple issues a
 * @privaterelay.appleid.com address that forwards to them. It's stable, so it
 * works as an identifier, but mail sent to it can bounce if they later turn
 * forwarding off.
 */

export type AppleSignInResult =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string }

/** Whether the device can offer Apple sign in at all. iOS 13+ only. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  let credential: AppleAuthentication.AppleAuthenticationCredential

  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
  } catch (e: any) {
    // Backing out of the sheet is a normal action, not an error to shout about.
    if (e?.code === 'ERR_REQUEST_CANCELED') return { ok: false, cancelled: true }
    return { ok: false, cancelled: false, message: e?.message ?? 'Apple sign in failed.' }
  }

  if (!credential.identityToken) {
    return { ok: false, cancelled: false, message: 'Apple did not return a sign in token.' }
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  })

  if (error) return { ok: false, cancelled: false, message: error.message }

  // Capture the name now or lose it for good.
  const given = credential.fullName?.givenName?.trim() ?? ''
  const family = credential.fullName?.familyName?.trim() ?? ''
  const name = [given, family].filter(Boolean).join(' ')

  if (name && data.user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.user.id)
        .single()

      // Only fill a blank. Never overwrite a name the student chose themselves,
      // which matters when an existing account signs in with Apple later.
      const existing = String(profile?.full_name ?? '').trim()
      if (!existing) {
        await supabase.from('profiles').update({ full_name: name }).eq('id', data.user.id)
      }
    } catch {
      // Signing in must still succeed even if the name write fails.
    }
  }

  return { ok: true }
}

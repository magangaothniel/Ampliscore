import { NATIVE_BUILD_READY } from './nativeFeatures'
import { Platform } from 'react-native'
import { supabase } from './supabase'

/**
 * Sign in with Apple.
 *
 * Loaded lazily inside try/catch. A top-level import of a native module that
 * isn't in the installed binary throws at import time, which takes down the
 * whole JS bundle and makes expo-updates roll back to the embedded one.
 *
 * The critical behaviour: Apple returns the user's name ONLY on the very first
 * authorization for this Apple ID and app, and never again. Not on the next
 * sign in, not after deleting and reinstalling. If it isn't captured in that
 * one moment it is gone permanently.
 */

let AppleAuthentication: any = null
let loadFailed = false

function loadNative(): boolean {
  // The require itself can crash natively, so it must never run in a
  // binary that lacks the module. This check comes first, always.
  if (!NATIVE_BUILD_READY) return false
  if (AppleAuthentication) return true
  if (loadFailed) return false
  try {
    AppleAuthentication = require('expo-apple-authentication')
    return true
  } catch {
    loadFailed = true
    return false
  }
}

/** Exposed so the login screen can render Apple's button only when it exists. */
export function getAppleModule(): any | null {
  return loadNative() ? AppleAuthentication : null
}

export type AppleSignInResult =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string }

/** Whether the device can offer Apple sign in. iOS 13+ with the module present. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  if (!loadNative()) return false
  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  if (!loadNative()) {
    return { ok: false, cancelled: false, message: 'Apple sign in is not available in this version.' }
  }

  let credential: any
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
  } catch (e: any) {
    // Backing out of the sheet is normal, not an error to shout about.
    if (e?.code === 'ERR_REQUEST_CANCELED') return { ok: false, cancelled: true }
    return { ok: false, cancelled: false, message: e?.message ?? 'Apple sign in failed.' }
  }

  if (!credential?.identityToken) {
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

      // Only fill a blank. Never overwrite a name the student chose.
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

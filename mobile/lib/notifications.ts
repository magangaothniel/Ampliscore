import { NATIVE_BUILD_READY } from './nativeFeatures'
import { Platform } from 'react-native'
import { supabase } from './supabase'

/**
 * Push notifications.
 *
 * Every native module here is loaded LAZILY, inside a try/catch. This is not
 * stylistic. A top-level `import * as Notifications from 'expo-notifications'`
 * runs when the file is imported, and if the native module isn't present in
 * the installed binary it throws, the whole JS bundle fails to load, and
 * expo-updates rolls back to the embedded bundle. The visible symptom is the
 * app appearing to lose months of work.
 *
 * OTA updates can ship JS that references native modules the installed binary
 * doesn't have yet. Guarding the load means those features are simply absent
 * until the next native build, instead of taking the app down.
 *
 * Permission is asked for at a moment the student already cares about, never
 * on first launch. iOS only lets you ask once.
 */

let Notifications: any = null
let Device: any = null
let Constants: any = null
let loadFailed = false

/** Returns true only when the native modules are actually usable. */
function loadNative(): boolean {
  // The require itself can crash natively, so it must never run in a
  // binary that lacks the module. This check comes first, always.
  if (!NATIVE_BUILD_READY) return false
  if (Notifications) return true
  if (loadFailed) return false
  try {
    Notifications = require('expo-notifications')
    Device = require('expo-device')
    Constants = require('expo-constants').default

    // Also lazy: this touches the native layer.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    })
    return true
  } catch {
    loadFailed = true
    Notifications = null
    return false
  }
}

/** True when push is available in this binary at all. */
export function isPushSupported(): boolean {
  return loadNative()
}

/** True when the OS has already granted permission. Never prompts. */
export async function hasPushPermission(): Promise<boolean> {
  if (!loadNative()) return false
  try {
    const { status } = await Notifications.getPermissionsAsync()
    return status === 'granted'
  } catch {
    return false
  }
}

/** True when we have neither been granted nor denied yet, so asking is possible. */
export async function canAskForPush(): Promise<boolean> {
  if (!loadNative()) return false
  try {
    const settings = await Notifications.getPermissionsAsync()
    if (settings.status === 'granted') return false
    return settings.canAskAgain !== false
  } catch {
    return false
  }
}

/**
 * Asks for permission and stores the resulting Expo push token.
 * Returns true only if permission was granted and a token was saved.
 */
export async function registerForPush(): Promise<boolean> {
  if (!loadNative()) return false

  try {
    // Simulators can't receive push. Asking there burns the one prompt.
    if (!Device.isDevice) return false

    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status

    if (status !== 'granted') {
      if (existing.canAskAgain === false) return false
      const asked = await Notifications.requestPermissionsAsync()
      status = asked.status
    }
    if (status !== 'granted') return false

    if (Platform.OS === 'android') {
      // Android drops notifications silently without a channel.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Ampliscore',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#7C3AED',
      })
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId
    if (!projectId) return false

    const res = await Notifications.getExpoPushTokenAsync({ projectId })
    const token = res.data

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // One row per device token. Re-registering is a no-op, but the token is
    // reassigned if the device changes hands between accounts.
    const { error } = await supabase.from('push_tokens').upsert(
      { token, user_id: user.id, platform: Platform.OS },
      { onConflict: 'token' }
    )
    return !error
  } catch {
    return false
  }
}

/**
 * Asks only if we've never asked before. Call from a moment of genuine value,
 * such as earning a badge, rather than at signup.
 */
export async function askForPushAfterWin(): Promise<boolean> {
  if (!(await canAskForPush())) return false
  return registerForPush()
}

/** Drops this device's token so pushes don't follow the account after sign out. */
export async function unregisterPush(): Promise<void> {
  if (!loadNative()) return
  try {
    if (!Device.isDevice) return
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId
    if (!projectId) return
    const res = await Notifications.getExpoPushTokenAsync({ projectId })
    await supabase.from('push_tokens').delete().eq('token', res.data)
  } catch {
    // Signing out must never fail because of this.
  }
}

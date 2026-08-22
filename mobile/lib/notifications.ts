import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'

/**
 * Push notifications.
 *
 * Permission is asked for at a moment the student already cares about, never
 * on first launch. One badly timed prompt is one tap away from notifications
 * being off permanently, and iOS only lets you ask once — after a denial the
 * only route back is the Settings app.
 */

// Show a banner even when the app is open, so an earned badge is visible
// without stealing focus.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

/** True when the OS has already granted permission. Never prompts. */
export async function hasPushPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

/** True when we have neither been granted nor denied yet, so asking is still possible. */
export async function canAskForPush(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync()
  if (settings.status === 'granted') return false
  // iOS reports canAskAgain false once the user has denied.
  return settings.canAskAgain !== false
}

/**
 * Asks for permission and stores the resulting Expo push token.
 * Returns true only if permission was granted and a token was saved.
 */
export async function registerForPush(): Promise<boolean> {
  // Simulators can't receive push. Asking there just burns the one prompt.
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
    // Android needs a channel or notifications are silently dropped.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Ampliscore',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#7C3AED',
    })
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId

  if (!projectId) return false

  let token: string
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId })
    token = res.data
  } catch {
    return false
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // One row per device token. Re-registering the same device is a no-op, but
  // the token is reassigned if the device changes hands between accounts.
  const { error } = await supabase.from('push_tokens').upsert(
    { token, user_id: user.id, platform: Platform.OS },
    { onConflict: 'token' }
  )

  return !error
}

/**
 * Asks only if we've never asked before. Call this from a moment of genuine
 * value — earning a badge — rather than at signup.
 */
export async function askForPushAfterWin(): Promise<boolean> {
  if (!(await canAskForPush())) return false
  return registerForPush()
}

/** Drops this device's token. Call on sign out so pushes don't follow the account. */
export async function unregisterPush(): Promise<void> {
  try {
    if (!Device.isDevice) return
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId
    if (!projectId) return
    const res = await Notifications.getExpoPushTokenAsync({ projectId })
    await supabase.from('push_tokens').delete().eq('token', res.data)
  } catch {
    // Signing out must never fail because of this.
  }
}

import { NATIVE_BUILD_READY } from './nativeFeatures'
import { supabase } from './supabase'

/**
 * expo-image-picker is loaded lazily inside try/catch. A top-level import of a
 * native module missing from the installed binary throws at import time, taking
 * down the whole JS bundle and forcing an expo-updates rollback.
 */
let ImagePicker: any = null
let loadFailed = false

function loadNative(): boolean {
  // The require itself can crash natively, so it must never run in a
  // binary that lacks the module. This check comes first, always.
  if (!NATIVE_BUILD_READY) return false
  if (ImagePicker) return true
  if (loadFailed) return false
  try {
    ImagePicker = require('expo-image-picker')
    return true
  } catch {
    loadFailed = true
    return false
  }
}

/** True when photo picking is possible in this binary. */
export function isPhotoPickerAvailable(): boolean {
  return loadNative()
}

/**
 * Avatar photo handling for mobile.
 *
 * The storage path matches web exactly: `<uid>/avatar.<ext>` with upsert. A
 * stable path means replacing a photo overwrites rather than accumulating
 * orphaned files against the Supabase free plan quota.
 *
 * Because the path is stable, the public URL never changes, so a cache buster
 * is appended when saving to profiles. Without it the CDN keeps serving the
 * previous image and the change looks like it silently failed.
 */

const MAX_BYTES = 2 * 1024 * 1024

export type AvatarResult =
  | { ok: true; url: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string }

/**
 * Base64 to bytes without pulling in a dependency. Uploading a Blob or a
 * `file://` URI directly through supabase-js on React Native is unreliable and
 * commonly lands a 0 byte object, so the bytes are passed explicitly.
 */
function base64ToBytes(b64: string): Uint8Array {
  const binary = global.atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Opens the photo library, uploads the chosen image, saves it to the profile. */
export async function pickAndUploadAvatar(): Promise<AvatarResult> {
  if (!loadNative()) {
    return { ok: false, cancelled: false, message: 'Photo upload needs the latest version of the app.' }
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) {
    return {
      ok: false,
      cancelled: false,
      message: perm.canAskAgain
        ? 'Ampliscore needs access to your photos to set a picture.'
        : 'Photo access is off. You can turn it on in Settings, under Ampliscore.',
    }
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    // Compressed on device, so a 6MB photo doesn't fail the size check for
    // something the student can't see or control.
    quality: 0.7,
    base64: true,
  })

  if (picked.canceled) return { ok: false, cancelled: true }

  const asset = picked.assets?.[0]
  if (!asset?.base64) {
    return { ok: false, cancelled: false, message: 'Could not read that image. Try another one.' }
  }

  const bytes = base64ToBytes(asset.base64)
  if (bytes.byteLength > MAX_BYTES) {
    return { ok: false, cancelled: false, message: 'That image is over 2MB. Try a smaller one.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, cancelled: false, message: 'Your session expired. Sign in again.' }

  const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0]
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
  const path = `${user.id}/avatar.${safeExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, {
      upsert: true,
      contentType: asset.mimeType ?? `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
    })

  if (uploadError) {
    return { ok: false, cancelled: false, message: 'Upload failed. Please try again.' }
  }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${publicUrl}?t=${Date.now()}`

  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
  if (error) return { ok: false, cancelled: false, message: 'Could not save your picture.' }

  return { ok: true, url }
}

/**
 * Clears the photo and deletes the stored files, so the avatar falls back to
 * the colour the student picked. Relies on the storage DELETE policy.
 */
export async function removeAvatar(): Promise<{ ok: boolean; message?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Your session expired. Sign in again.' }

  // The stored URL carries a cache busting query string, so the object key is
  // rebuilt from the folder listing rather than parsed out of the URL.
  const { data: files } = await supabase.storage.from('avatars').list(user.id)
  if (files?.length) {
    await supabase.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`))
  }

  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
  if (error) return { ok: false, message: 'Could not remove your picture.' }

  return { ok: true }
}

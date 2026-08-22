/**
 * One switch for native modules that are declared in package.json but are NOT
 * yet inside the installed binary.
 *
 * Why this exists, and why try/catch was not enough:
 *
 * `require('expo-notifications')` in a binary without that native module does
 * not reliably throw a JavaScript error. It can fail below JS, in the native
 * layer, which crashes the app outright. A try/catch around the require cannot
 * catch that. Lazy loading kept the bundle from failing at import, but any
 * code path that actually reached the require still crashed.
 *
 * OTA updates ship JavaScript into whatever binary is already installed, so
 * new JS can always reference native modules the binary does not have. This
 * flag is the guard: while it is false, nothing calls into those modules at
 * all, and the features are simply absent.
 *
 * FLIP THIS TO true ONLY AFTER an EAS build containing these packages has been
 * installed on devices:
 *   expo-notifications, expo-device, expo-apple-authentication,
 *   expo-image-picker, expo-clipboard, expo-local-authentication
 *
 * Flipping it before that build ships will crash the app on sign out, on
 * earning a badge, and on opening the login screen.
 */
export const NATIVE_BUILD_READY = false

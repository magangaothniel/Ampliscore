import { Platform } from 'react-native'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases'
import { supabase } from './supabase'

// RevenueCat public SDK key. Safe to ship in the client — it can only read
// offerings and start purchases, never issue entitlements. Grab it from
// app.revenuecat.com → Project → API keys → "Public app-specific" (iOS).
const REVENUECAT_IOS_KEY = 'appl_REPLACE_ME'

// Entitlement identifier configured in the RevenueCat dashboard. Every Pro
// product (monthly today, annual later) maps to this one entitlement, so the
// app never has to care which SKU the user bought.
export const PRO_ENTITLEMENT = 'pro'

let configured = false

export function purchasesAvailable(): boolean {
  return Platform.OS === 'ios' && !REVENUECAT_IOS_KEY.includes('REPLACE_ME')
}

/**
 * Safe to call more than once — the SDK is only configured on the first call.
 * `appUserID` is the Supabase user id, which is what ties an Apple purchase
 * back to a row in `profiles` when RevenueCat calls our webhook.
 */
export async function initPurchases(userId: string): Promise<void> {
  if (!purchasesAvailable()) return

  try {
    if (!configured) {
      if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG)
      Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: userId })
      configured = true
    } else {
      // Session changed (sign out → sign in as someone else).
      await Purchases.logIn(userId)
    }
  } catch {
    // Never let a StoreKit/network hiccup block app startup. The paywall
    // surfaces its own error if the user actually tries to buy.
  }
}

export async function resetPurchasesUser(): Promise<void> {
  if (!purchasesAvailable() || !configured) return
  try {
    await Purchases.logOut()
  } catch {
    // Logging out of RevenueCat is best-effort; Supabase sign-out is the
    // source of truth for who is signed in.
  }
}

export function isProFromCustomerInfo(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[PRO_ENTITLEMENT] !== 'undefined'
}

/**
 * Fetches the Pro package to show on the paywall.
 * Returns null when offerings aren't configured yet or the store is unreachable.
 */
export async function getProPackage(): Promise<PurchasesPackage | null> {
  if (!purchasesAvailable()) return null
  try {
    const offerings = await Purchases.getOfferings()
    return offerings.current?.availablePackages[0] ?? null
  } catch {
    return null
  }
}

/**
 * True when Pro on this account came from an Apple subscription. Cancellation
 * then has to happen in Apple's settings — the Stripe billing portal knows
 * nothing about it, and Apple rejects apps that send subscribers to the wrong
 * place to cancel.
 */
export async function hasAppleSubscription(): Promise<boolean> {
  if (!purchasesAvailable()) return false
  try {
    const info = await Purchases.getCustomerInfo()
    return isProFromCustomerInfo(info)
  } catch {
    return false
  }
}

export type PurchaseOutcome =
  | { status: 'purchased' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

export async function purchasePro(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    if (isProFromCustomerInfo(customerInfo)) {
      await syncProToSupabase(true)
      return { status: 'purchased' }
    }
    return { status: 'error', message: 'Purchase completed but Pro was not unlocked. Try Restore Purchases.' }
  } catch (e: any) {
    if (e?.userCancelled) return { status: 'cancelled' }
    return { status: 'error', message: e?.message ?? 'Something went wrong with the purchase.' }
  }
}

/**
 * Apple requires a visible restore path for any app selling subscriptions.
 */
export async function restorePro(): Promise<PurchaseOutcome> {
  try {
    const info = await Purchases.restorePurchases()
    if (isProFromCustomerInfo(info)) {
      await syncProToSupabase(true)
      return { status: 'purchased' }
    }
    return { status: 'error', message: 'No active Ampliscore Pro subscription found on this Apple ID.' }
  } catch (e: any) {
    return { status: 'error', message: e?.message ?? 'Could not restore purchases.' }
  }
}

/**
 * Optimistic local write so Pro unlocks immediately instead of waiting on the
 * RevenueCat webhook round trip. The webhook remains the authority — it is what
 * revokes access on expiration, which the client can't be trusted to do.
 */
async function syncProToSupabase(isPro: boolean): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ is_pro: isPro }).eq('id', user.id)
  } catch {
    // The webhook will still flip the flag server-side within a few seconds.
  }
}

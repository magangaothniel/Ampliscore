import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_build_placeholder");

/**
 * Subscription statuses that mean money is still moving. `canceled`,
 * `incomplete_expired`, and `paused` are excluded deliberately.
 */
const BILLING_STATUSES: Stripe.Subscription.Status[] = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
];

export type Revenue = {
  /** Monthly recurring revenue in dollars, e.g. "4.99". Null if Stripe failed. */
  mrr: string | null;
  /** Accounts with an active Stripe subscription. Null if Stripe failed. */
  subscribers: number | null;
};

/**
 * Reads MRR from Stripe. Never infer revenue from the database.
 *
 * Beta testers are granted `is_pro` without paying, so counting profile rows
 * overstated revenue 6x — it reported $29.94 against a single real
 * subscription. `is_beta` doesn't separate them either, since the one paying
 * account is also flagged as beta. Stripe is the only source that knows who
 * actually pays, and it stays correct through price changes and coupons.
 *
 * Amounts are normalised to monthly. Only monthly billing exists today; the
 * yearly branch is here so adding an annual plan can't silently inflate MRR.
 */
export async function getStripeRevenue(): Promise<Revenue> {
  try {
    let cents = 0;
    let subscribers = 0;

    for await (const sub of stripe.subscriptions.list({ status: "active", limit: 100 })) {
      subscribers++;
      for (const item of sub.items.data) {
        const amount = (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
        const interval = item.price.recurring?.interval;
        const every = item.price.recurring?.interval_count ?? 1;

        if (interval === "year") cents += amount / (12 * every);
        else if (interval === "month") cents += amount / every;
        else cents += amount;
      }
    }

    return { mrr: (cents / 100).toFixed(2), subscribers };
  } catch {
    // A Stripe outage shouldn't take down the admin dashboard or block the
    // weekly email. Report the number as unavailable rather than inventing one.
    return { mrr: null, subscribers: null };
  }
}

/**
 * Every still-billing subscription for one customer, found by email.
 *
 * Email is the lookup key rather than `profiles.stripe_customer_id`, because
 * that column is only written by the checkout webhook and is null for accounts
 * granted Pro by hand. The billing portal route resolves customers the same way.
 *
 * Throws on Stripe failure. Callers decide what a failure means: the delete
 * route refuses to proceed, the disclosure endpoint reports it as unknown.
 */
export async function findBillingSubscriptions(
  email: string | undefined
): Promise<Stripe.Subscription[]> {
  if (!email) return [];

  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length === 0) return [];

  const subs = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: "all",
    limit: 100,
  });

  return subs.data.filter((s) => BILLING_STATUSES.includes(s.status));
}

/** Cancels a subscription immediately. */
export async function cancelSubscription(id: string): Promise<void> {
  await stripe.subscriptions.cancel(id);
}

/** What the delete confirmation screen needs to tell the user the truth. */
export type BillingDisclosure = {
  /** True only when Stripe confirmed a billing subscription exists. */
  hasActiveSubscription: boolean;
  /** Dollar amount per interval, e.g. "4.99". Null when there's nothing to bill. */
  amount: string | null;
  /** "month" or "year". Null when there's nothing to bill. */
  interval: string | null;
  /** True when Stripe couldn't be reached, so the UI can soften its wording. */
  unknown: boolean;
};

export async function getBillingDisclosure(
  email: string | undefined
): Promise<BillingDisclosure> {
  try {
    const subs = await findBillingSubscriptions(email);
    if (subs.length === 0) {
      return { hasActiveSubscription: false, amount: null, interval: null, unknown: false };
    }

    let cents = 0;
    for (const sub of subs) {
      for (const item of sub.items.data) {
        cents += (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
      }
    }

    const interval = subs[0].items.data[0]?.price.recurring?.interval ?? null;

    return {
      hasActiveSubscription: true,
      amount: (cents / 100).toFixed(2),
      interval,
      unknown: false,
    };
  } catch {
    // Don't claim there's no subscription when we simply couldn't check.
    return { hasActiveSubscription: false, amount: null, interval: null, unknown: true };
  }
}

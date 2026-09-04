-- Adds a record of WHERE a user's Pro access came from.
--
-- Without it, Stripe and Apple webhooks fight over the same is_pro flag: an
-- Apple EXPIRATION would revoke a Stripe subscriber, and a Stripe cancellation
-- would revoke someone who moved to an App Store subscription. Each webhook now
-- only revokes access it granted.
--
-- Values: 'stripe' | 'apple' | 'grant' (beta testers and referral unlocks) | null
--
-- Run once in the Supabase SQL editor.

alter table profiles
  add column if not exists pro_source text;

-- Backfill: anyone already Pro with a Stripe customer came in through Stripe.
update profiles
   set pro_source = 'stripe'
 where is_pro = true
   and pro_source is null
   and stripe_customer_id is not null;

-- Everyone else who is Pro today was granted it by hand (beta testers,
-- referral unlocks). Marking them 'grant' keeps either webhook from revoking
-- access that was never bought.
update profiles
   set pro_source = 'grant'
 where is_pro = true
   and pro_source is null;

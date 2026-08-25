/**
 * Sending push notifications through Expo.
 *
 * Tokens live in `push_tokens`, written by the app when a student turns
 * notifications on. Presence of a token is the opt-in: the settings toggle
 * deletes the row when they turn it off, so there is no separate preference
 * column to check.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
};

export type PushOutcome = {
  sent: number;
  failed: number;
  /** Tokens Apple rejected as dead. The caller should delete these. */
  deadTokens: string[];
};

/**
 * Sends messages in chunks of 100, which is Expo's documented limit.
 *
 * Never throws. A push failing must not take down the cron that also sends
 * email, so problems come back in the return value instead.
 */
export async function sendPushNotifications(
  messages: PushMessage[]
): Promise<PushOutcome> {
  const out: PushOutcome = { sent: 0, failed: 0, deadTokens: [] };
  if (messages.length === 0) return out;

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          chunk.map((m) => ({
            to: m.to,
            title: m.title,
            body: m.body,
            data: m.data ?? {},
            sound: "default",
          }))
        ),
      });

      if (!res.ok) {
        out.failed += chunk.length;
        continue;
      }

      const json = await res.json();
      const tickets: any[] = json?.data ?? [];

      tickets.forEach((ticket, idx) => {
        if (ticket?.status === "ok") {
          out.sent++;
          return;
        }
        out.failed++;
        // The device uninstalled the app or the token was revoked. Keeping it
        // means every future run wastes a call on a phone that can't receive.
        if (ticket?.details?.error === "DeviceNotRegistered") {
          const token = chunk[idx]?.to;
          if (token) out.deadTokens.push(token);
        }
      });
    } catch {
      out.failed += chunk.length;
    }
  }

  return out;
}

/** Wording for an assignment reminder, kept short enough for a lock screen. */
export function dueTomorrowMessage(
  items: { name: string; course: string; isExam: boolean }[]
): { title: string; body: string } {
  if (items.length === 1) {
    const it = items[0];
    return {
      title: it.isExam ? "Exam tomorrow" : "Due tomorrow",
      body: `${it.name} · ${it.course}`,
    };
  }

  const exams = items.filter((i) => i.isExam).length;
  return {
    title: `${items.length} things due tomorrow`,
    body: exams > 0
      ? `Including ${exams} exam${exams > 1 ? "s" : ""}. Tap to see them.`
      : items.map((i) => i.name).slice(0, 3).join(", "),
  };
}

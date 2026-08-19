/**
 * Thin wrapper around Meta's WhatsApp Cloud API (Graph API).
 *
 * Setup required (this cannot be tested/configured for you — it needs your
 * own Meta Business/WhatsApp Business account):
 *   1. Create a Meta App with the WhatsApp product in Meta Business Manager.
 *   2. Get a phone number ID and a permanent access token (System User token
 *      recommended over the 24h temporary token).
 *   3. Business-initiated messages (which almost everything here is — task
 *      assignments, deadline reminders, etc.) require an APPROVED MESSAGE
 *      TEMPLATE. Free-form text only works within 24h of the customer
 *      messaging you first, which won't normally happen for internal
 *      notifications. Create a simple template (e.g. two body variables:
 *      title + message) in Meta Business Manager and wait for approval.
 *   4. Set the env vars below.
 *
 * Until WHATSAPP_ENABLED=true and credentials are set, every call here is a
 * harmless no-op — the rest of the app (in-app notifications, email, etc.)
 * is unaffected either way.
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const ENABLED = process.env.WHATSAPP_ENABLED === "true";

// "template" (default, required for business-initiated messages in
// production) or "text" (only works within a 24h customer-service window —
// handy for local testing against the Meta test number/sandbox).
const MESSAGE_MODE = (process.env.WHATSAPP_MESSAGE_MODE || "template") as "template" | "text";
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "work_notification";
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || "en_US";

export interface WhatsAppSendResult {
  skipped: boolean;
  reason?: string;
  ok?: boolean;
  error?: unknown;
}

function normalizePhone(phone: string) {
  // Cloud API wants digits only (country code + number), no "+".
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

/**
 * Sends a WhatsApp notification. Never throws — always resolves with a
 * result object, so callers (e.g. notificationService) can fire this
 * without risking the underlying in-app action (task assignment, etc.).
 */
export async function sendWhatsAppNotification(
  toPhone: string | undefined | null,
  title: string,
  message: string
): Promise<WhatsAppSendResult> {
  if (!ENABLED) return { skipped: true, reason: "WhatsApp integration is disabled (WHATSAPP_ENABLED)" };
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return { skipped: true, reason: "WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not configured" };
  }
  if (!toPhone) return { skipped: true, reason: "Recipient has no phone number on file" };

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const body =
    MESSAGE_MODE === "text"
      ? {
          messaging_product: "whatsapp",
          to: normalizePhone(toPhone),
          type: "text",
          text: { body: `${title}\n\n${message}` },
        }
      : {
          messaging_product: "whatsapp",
          to: normalizePhone(toPhone),
          type: "template",
          template: {
            name: TEMPLATE_NAME,
            language: { code: TEMPLATE_LANG },
            components: [
              {
                type: "body",
                // Matches a 2-variable template body like:
                // "{{1}}: {{2}}" — adjust to match whatever template you get approved.
                parameters: [
                  { type: "text", text: title.slice(0, 60) },
                  { type: "text", text: message.slice(0, 300) },
                ],
              },
            ],
          },
        };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => undefined);

    if (!res.ok) {
      console.error("[whatsapp] send failed", res.status, data);
      return { skipped: false, ok: false, error: data };
    }

    return { skipped: false, ok: true };
  } catch (err) {
    console.error("[whatsapp] send error", err);
    return { skipped: false, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

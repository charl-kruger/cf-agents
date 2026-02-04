
/**
 * Verify a Slack webhook signature using HMAC-SHA256.
 */
export async function verifySlackSignature(
    body: string,
    signature: string,
    timestamp: string,
    signingSecret: string
): Promise<boolean> {
    try {
        const encoder = new TextEncoder();
        const baseString = `v0:${timestamp}:${body}`;
        const keyData = encoder.encode(signingSecret);
        const baseData = encoder.encode(baseString);

        const key = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBuffer = await crypto.subtle.sign("HMAC", key, baseData);
        const computedSignature = `v0=${Array.from(new Uint8Array(signatureBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")}`;

        return computedSignature === signature;
    } catch (e) {
        console.error("Slack signature verification failed:", e);
        return false;
    }
}

export type SlackInteractionResponse = {
    message: string;
    userId: string;
    channelId: string;
    reply: (text: string) => Promise<void>;
};

/**
 * Standard handler for Slack events and interactions
 */
export async function handleSlackWebhook(
    request: Request,
    env: { SLACK_SIGNING_SECRET: string; SLACK_TOKEN: string }
): Promise<SlackInteractionResponse | Response | null> {
    if (request.method !== "POST") return null;

    const signature = request.headers.get("X-Slack-Signature");
    const timestamp = request.headers.get("X-Slack-Timestamp");
    const body = await request.text();

    if (!signature || !timestamp || !env.SLACK_SIGNING_SECRET) {
        return new Response("Missing signature headers", { status: 401 });
    }

    const isValid = await verifySlackSignature(
        body,
        signature,
        timestamp,
        env.SLACK_SIGNING_SECRET
    );

    if (!isValid) {
        return new Response("Invalid request signature", { status: 401 });
    }

    const payload = JSON.parse(body);

    // Handle URL Verification (Challenge)
    if (payload.type === "url_verification") {
        return new Response(payload.challenge, { status: 200 });
    }

    // Handle Event Callback
    if (payload.type === "event_callback") {
        const event = payload.event;

        // Ignore bot messages to prevent loops
        if (event.bot_id || event.subtype === "bot_message") {
            return new Response("Ignored bot message", { status: 200 });
        }

        if (event.type === "message" || event.type === "app_mention") {
            return {
                message: event.text,
                userId: event.user,
                channelId: event.channel,
                reply: async (text: string) => {
                    await fetch("https://slack.com/api/chat.postMessage", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${env.SLACK_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            channel: event.channel,
                            text: text,
                        }),
                    });
                },
            };
        }
    }

    return new Response("Event received", { status: 200 });
}


/**
 * Verify a Discord webhook signature using Ed25519.
 */
export async function verifyDiscordSignature(
    payload: string,
    signature: string,
    timestamp: string,
    publicKey: string
): Promise<boolean> {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(timestamp + payload);
        const signatureBytes = new Uint8Array(
            signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        );
        const publicKeyBytes = new Uint8Array(
            publicKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        );

        const key = await crypto.subtle.importKey(
            "raw",
            publicKeyBytes,
            { name: "Ed25519", namedCurve: "Ed25519" },
            false,
            ["verify"]
        );

        return await crypto.subtle.verify(
            "Ed25519",
            key,
            signatureBytes,
            data
        );
    } catch (e) {
        console.error("Discord signature verification failed:", e);
        return false;
    }
}

export type DiscordInteractionResponse = {
    message: string;
    userId: string;
    channelId: string;
    reply: (text: string) => Promise<void>;
};

/**
 * Standard handler for Discord interactions (slash commands or outgoing webhooks)
 */
export async function handleDiscordWebhook(
    request: Request,
    env: { DISCORD_PUBLIC_KEY: string; DISCORD_TOKEN: string }
): Promise<DiscordInteractionResponse | Response | null> {
    if (request.method !== "POST") return null;

    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");
    const body = await request.text();

    if (!signature || !timestamp || !env.DISCORD_PUBLIC_KEY) {
        return new Response("Missing signature headers", { status: 401 });
    }

    const isValid = await verifyDiscordSignature(
        body,
        signature,
        timestamp,
        env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
        return new Response("Invalid request signature", { status: 401 });
    }

    const interaction = JSON.parse(body);

    // Handle PING from Discord
    if (interaction.type === 1) {
        return new Response(JSON.stringify({ type: 1 }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // Handle Application Command (Slash Command) or Message Component
    if (interaction.type === 2 || interaction.type === 3) {
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const channelId = interaction.channel_id;
        const message = interaction.data?.options?.[0]?.value || interaction.data?.custom_id || "";

        return {
            message,
            userId,
            channelId,
            reply: async (text: string) => {
                const url = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`;
                await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                        data: { content: text },
                    }),
                });
            },
        };
    }

    return null;
}

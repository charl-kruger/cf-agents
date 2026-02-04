
export type TelegramInteractionResponse = {
    message: string;
    userId: string;
    chatId: string;
    reply: (text: string) => Promise<void>;
};

/**
 * Standard handler for Telegram updates.
 * For production, you should set a secret_token when calling setWebhook.
 */
export async function handleTelegramWebhook(
    request: Request,
    env: { TELEGRAM_TOKEN: string; TELEGRAM_SECRET_TOKEN?: string }
): Promise<TelegramInteractionResponse | Response | null> {
    if (request.method !== "POST") return null;

    // Optional: Verify secret token
    const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (env.TELEGRAM_SECRET_TOKEN && secretToken !== env.TELEGRAM_SECRET_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
    }

    const update = await request.json() as any;

    // Handle messages
    if (update.message) {
        const message = update.message;
        const text = message.text || "";
        const chatId = message.chat.id.toString();
        const userId = message.from.id.toString();

        return {
            message: text,
            userId,
            chatId,
            reply: async (replyText: string) => {
                await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: replyText,
                    }),
                });
            },
        };
    }

    return new Response("OK", { status: 200 });
}

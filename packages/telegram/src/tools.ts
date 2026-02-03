import { tool } from "ai";
import { z } from "zod";
import type { TelegramToken, TelegramMessage, TelegramResponse } from "./types";

interface ToolContext {
    getToken: () => Promise<TelegramToken>;
}

export const createTelegramTools = (context: ToolContext) => {
    const getAuthenticatedFetch = async (method: string, body: Record<string, unknown>) => {
        const { token } = await context.getToken();
        const url = `https://api.telegram.org/bot${token}/${method}`;
        return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
    };

    return {
        telegramSendMessage: tool({
            description: "Send a message to a Telegram chat",
            parameters: z.object({
                chatId: z.string().describe("The ID of the chat/channel to send to (e.g. @channelname or numeric ID)"),
                text: z.string().describe("The text content of the message"),
            }),
            execute: async ({ chatId, text }) => {
                const response = await getAuthenticatedFetch("sendMessage", {
                    chat_id: chatId,
                    text: text,
                });

                const data = (await response.json()) as TelegramResponse<TelegramMessage>;

                if (!data.ok) {
                    throw new Error(`Telegram API error: ${data.description}`);
                }

                return `Message sent! Message ID: ${data.result.message_id}`;
            },
        }),
    };
};

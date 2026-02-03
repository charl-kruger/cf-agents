import { tool } from "ai";
import { z } from "zod";
import type { DiscordToken, DiscordMessage } from "./types";

interface ToolContext {
    getToken: () => Promise<DiscordToken>;
}

const DISCORD_API_BASE = "https://discord.com/api/v10";

export const createDiscordTools = (context: ToolContext) => {
    const getAuthenticatedFetch = async (url: string, options: RequestInit = {}) => {
        const { token } = await context.getToken();
        const headers = {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
        };
        return fetch(url, { ...options, headers });
    };

    return {
        discordChannelSend: tool({
            description: "Send a message to a Discord channel",
            parameters: z.object({
                channelId: z.string().describe("The ID of the channel to send to"),
                content: z.string().describe("The message content"),
            }),
            execute: async ({ channelId, content }) => {
                const response = await getAuthenticatedFetch(
                    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
                    {
                        method: "POST",
                        body: JSON.stringify({ content }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`Discord API error: ${await response.text()}`);
                }

                const data = (await response.json()) as DiscordMessage;
                return `Message sent! ID: ${data.id}`;
            },
        }),

        discordChannelHistory: tool({
            description: "Read recent messages from a Discord channel",
            parameters: z.object({
                channelId: z.string().describe("The ID of the channel to read from"),
                limit: z.number().optional().default(10).describe("Number of messages to retrieve (max 100)"),
            }),
            execute: async ({ channelId, limit }) => {
                const params = new URLSearchParams({ limit: String(limit) });
                const response = await getAuthenticatedFetch(
                    `${DISCORD_API_BASE}/channels/${channelId}/messages?${params}`
                );

                if (!response.ok) {
                    throw new Error(`Discord API error: ${await response.text()}`);
                }

                const messages = (await response.json()) as DiscordMessage[];
                if (messages.length === 0) {
                    return "No messages found.";
                }

                return messages
                    .reverse() // Oldest first
                    .map((msg) => `${msg.author.username}: ${msg.content}`)
                    .join("\n");
            },
        }),
    };
};

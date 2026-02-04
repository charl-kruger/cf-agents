import { tool } from "ai";
import { z } from "zod";
import type { DiscordToken, DiscordMessage } from "./types";

interface ToolContext {
    getToken: () => Promise<DiscordToken>;
    config?: {
        channelId?: string;
    };
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
                channelId: z.string().optional().describe("The ID of the channel to send to. Optional if a channel is pre-configured."),
                content: z.string().describe("The message content"),
            }),
            execute: async ({ channelId, content }) => {
                const targetChannelId = channelId ?? context.config?.channelId;
                if (!targetChannelId) {
                    throw new Error("No channelId provided and no default channel configured.");
                }

                const response = await getAuthenticatedFetch(
                    `${DISCORD_API_BASE}/channels/${targetChannelId}/messages`,
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
                channelId: z.string().optional().describe("The ID of the channel to read from. Optional if a channel is pre-configured."),
                limit: z.number().optional().default(10).describe("Number of messages to retrieve (max 100)"),
            }),
            execute: async ({ channelId, limit }) => {
                const targetChannelId = channelId ?? context.config?.channelId;
                if (!targetChannelId) {
                    throw new Error("No channelId provided and no default channel configured.");
                }

                const params = new URLSearchParams({ limit: String(limit) });
                const response = await getAuthenticatedFetch(
                    `${DISCORD_API_BASE}/channels/${targetChannelId}/messages?${params}`
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

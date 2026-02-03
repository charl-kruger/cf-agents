import { tool } from "ai";
import { z } from "zod";
import type { SlackToken, SlackPostMessageResponse, SlackHistoryResponse } from "./types";

interface ToolContext {
    getToken: () => Promise<SlackToken>;
}

export const createSlackTools = (context: ToolContext) => {
    const getAuthenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
        const { token } = await context.getToken();
        const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
        };
        return fetch(`https://slack.com/api/${endpoint}`, { ...options, headers });
    };

    return {
        slackSendMessage: tool({
            description: "Send a message to a Slack channel",
            parameters: z.object({
                channelId: z.string().describe("The ID of the channel to send to"),
                text: z.string().describe("The text content of the message"),
            }),
            execute: async ({ channelId, text }) => {
                const response = await getAuthenticatedFetch("chat.postMessage", {
                    method: "POST",
                    body: JSON.stringify({ channel: channelId, text }),
                });

                if (!response.ok) {
                    throw new Error(`Slack API error: ${await response.text()}`);
                }

                const data = (await response.json()) as SlackPostMessageResponse;
                if (!data.ok) {
                    throw new Error(`Slack API error: ${data.error}`);
                }

                return `Message sent! Timestamp: ${data.ts}`;
            },
        }),

        slackChannelHistory: tool({
            description: "Read recent messages from a Slack channel",
            parameters: z.object({
                channelId: z.string().describe("The ID of the channel to read from"),
                limit: z.number().optional().default(10).describe("Number of messages to retrieve (max 100)"),
            }),
            execute: async ({ channelId, limit }) => {
                const params = new URLSearchParams({
                    channel: channelId,
                    limit: String(limit)
                });

                const response = await getAuthenticatedFetch(`conversations.history?${params}`, {
                    method: "GET"
                });

                if (!response.ok) {
                    throw new Error(`Slack API error: ${await response.text()}`);
                }

                const data = (await response.json()) as SlackHistoryResponse;
                if (!data.ok) {
                    throw new Error(`Slack API error: ${data.error}`);
                }

                if (!data.messages || data.messages.length === 0) {
                    return "No messages found.";
                }

                return data.messages
                    .reverse()
                    .map((msg) => {
                        const user = msg.user || msg.bot_id || "Unknown";
                        return `${user}: ${msg.text}`;
                    })
                    .join("\n");
            },
        }),
    };
};

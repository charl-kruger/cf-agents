import { tool } from "ai";
import { z } from "zod";
import type {
    GoogleToken,
    GmailMessageList,
    GmailMessageDetail,
    GoogleCalendarList,
    GoogleCalendarEvent,
    GoogleSheetValueRange
} from "./types";

interface ToolContext {
    getToken: () => Promise<GoogleToken>;
}

export const createGoogleTools = (context: ToolContext) => {
    const getAuthenticatedFetch = async (url: string, options: RequestInit = {}) => {
        const token = await context.getToken();
        const headers = {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
            ...options.headers,
        };
        return fetch(url, { ...options, headers });
    };

    return {
        gmailListEmails: tool({
            description: "List emails from Gmail matching a query",
            parameters: z.object({
                query: z.string().describe("Gmail search query (e.g., 'from:boss is:unread')"),
                maxResults: z.number().optional().describe("Maximum number of emails to return (default 10)"),
            }),
            execute: async ({ query, maxResults = 10 }) => {
                const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
                const response = await getAuthenticatedFetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`
                );

                if (!response.ok) {
                    throw new Error(`Gmail API error: ${await response.text()}`);
                }

                const data = (await response.json()) as GmailMessageList;
                const messages = data.messages || [];

                const emails = await Promise.all(
                    messages.map(async (msg) => {
                        const detailRes = await getAuthenticatedFetch(
                            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`
                        );
                        const detail = (await detailRes.json()) as GmailMessageDetail;
                        const headers = detail.payload.headers;
                        const subject = headers.find((h) => h.name === "Subject")?.value;
                        const from = headers.find((h) => h.name === "From")?.value;
                        return `From: ${from}, Subject: ${subject}, Snippet: ${detail.snippet}`;
                    })
                );

                return emails.join("\n");
            },
        }),

        gmailSendEmail: tool({
            description: "Send an email using Gmail",
            parameters: z.object({
                to: z.string().describe("Recipient email address"),
                subject: z.string().describe("Email subject"),
                body: z.string().describe("Email body content"),
            }),
            execute: async ({ to, subject, body }) => {
                const message = [
                    `To: ${to}`,
                    `Subject: ${subject}`,
                    "Content-Type: text/plain; charset=utf-8",
                    "",
                    body,
                ].join("\n");

                const encodedMessage = btoa(message).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

                const response = await getAuthenticatedFetch(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                    {
                        method: "POST",
                        body: JSON.stringify({ raw: encodedMessage }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`Gmail API error: ${await response.text()}`);
                }

                const data = (await response.json()) as { id: string };
                return `Email sent! ID: ${data.id}`;
            },
        }),

        calendarListEvents: tool({
            description: "List upcoming calendar events",
            parameters: z.object({
                maxResults: z.number().optional().default(10),
            }),
            execute: async ({ maxResults }) => {
                const params = new URLSearchParams({
                    maxResults: String(maxResults),
                    timeMin: new Date().toISOString(),
                    singleEvents: "true",
                    orderBy: "startTime",
                });

                const response = await getAuthenticatedFetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`
                );

                if (!response.ok) {
                    throw new Error(`Calendar API error: ${await response.text()}`);
                }

                const data = (await response.json()) as GoogleCalendarList;
                const events = data.items || [];

                if (events.length === 0) {
                    return "No upcoming events found.";
                }

                return events
                    .map((event) => {
                        const start = event.start.dateTime || event.start.date;
                        return `${start} - ${event.summary}`;
                    })
                    .join("\n");
            },
        }),

        calendarCreateEvent: tool({
            description: "Create a new calendar event",
            parameters: z.object({
                summary: z.string().describe("Event title"),
                description: z.string().optional().describe("Event description"),
                startTime: z.string().describe("Start time (ISO string)"),
                endTime: z.string().describe("End time (ISO string)"),
            }),
            execute: async ({ summary, description, startTime, endTime }) => {
                const event = {
                    summary,
                    description,
                    start: { dateTime: startTime },
                    end: { dateTime: endTime },
                };

                const response = await getAuthenticatedFetch(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    {
                        method: "POST",
                        body: JSON.stringify(event),
                    }
                );

                if (!response.ok) {
                    throw new Error(`Calendar API error: ${await response.text()}`);
                }

                const data = (await response.json()) as GoogleCalendarEvent;
                return `Event created! Link: ${data.htmlLink}`;
            },
        }),

        sheetsGetValues: tool({
            description: "Read values from a Google Sheet",
            parameters: z.object({
                spreadsheetId: z.string().describe("The ID of the spreadsheet"),
                range: z.string().describe("The A1 notation of the range to read (e.g. 'Sheet1!A1:B2')"),
            }),
            execute: async ({ spreadsheetId, range }) => {
                const response = await getAuthenticatedFetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`
                );

                if (!response.ok) {
                    throw new Error(`Sheets API error: ${await response.text()}`);
                }

                const data = (await response.json()) as GoogleSheetValueRange;
                if (!data.values || data.values.length === 0) {
                    return "No data found.";
                }

                return data.values.map((row: string[]) => row.join(", ")).join("\n");
            },
        }),

        sheetsAppendValue: tool({
            description: "Append values to a Google Sheet",
            parameters: z.object({
                spreadsheetId: z.string().describe("The ID of the spreadsheet"),
                range: z.string().describe("The A1 notation of the range to append to"),
                values: z.array(z.string()).describe("Array of strings to append as a row"),
            }),
            execute: async ({ spreadsheetId, range, values }) => {
                const response = await getAuthenticatedFetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            values: [values],
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`Sheets API error: ${await response.text()}`);
                }

                const data = (await response.json()) as { updates: { updatedRange: string } };
                return `Values appended to ${data.updates?.updatedRange || "sheet"}`;
            },
        }),
    };
};

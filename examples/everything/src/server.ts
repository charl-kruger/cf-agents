import { routeAgentRequest, type Schedule } from "agents";

import { getSchedulePrompt } from "agents/schedule";

import { AIChatAgent } from "@cloudflare/ai-chat";
import {
  generateId,
  streamText,
  type StreamTextOnFinishCallback,
  stepCountIs,
  createUIMessageStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  type ToolSet
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { processToolCalls, cleanupMessages } from "./utils";
import { tools, executions } from "./tools";
// import { env } from "cloudflare:workers";
import {
  createGoogleTools,
  type GoogleToken,
  getAuthUrl,
  getTokenFromCode,
  refreshAccessToken
} from "@cf-agents/google";
import { createDiscordTools, handleDiscordWebhook } from "@cf-agents/discord";
import { createTelegramTools, handleTelegramWebhook } from "@cf-agents/telegram";
import { createSlackTools, handleSlackWebhook } from "@cf-agents/slack";

// Cloudflare AI Gateway
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
//   baseURL: env.GATEWAY_BASE_URL,
// });

/**
 * Chat Agent implementation that handles real-time AI chat interactions
 */
export class Chat extends AIChatAgent<Env> {
  googleTokens: GoogleToken | null = null;

  async getValidGoogleToken(): Promise<GoogleToken> {
    if (!this.googleTokens) {
      // Try to load from storage
      const stored = await this.ctx.storage.get<GoogleToken>("google_tokens");
      if (stored) {
        this.googleTokens = stored;
      }
    }

    if (!this.googleTokens) {
      throw new Error("No Google tokens found. Please authenticate first.");
    }

    if (Date.now() >= this.googleTokens.expiresAt) {
      if (!this.googleTokens.refreshToken) {
        throw new Error("Token expired and no refresh token available.");
      }

      console.log("Refreshing Google access token...");
      const newTokens = await refreshAccessToken(
        {
          clientId: this.env.GOOGLE_CLIENT_ID,
          clientSecret: this.env.GOOGLE_CLIENT_SECRET,
          redirectUri: this.env.GOOGLE_REDIRECT_URI
        },
        this.googleTokens.refreshToken
      );

      this.googleTokens = {
        ...newTokens,
        refreshToken: newTokens.refreshToken || this.googleTokens.refreshToken
      };
      await this.ctx.storage.put("google_tokens", this.googleTokens);
    }

    return this.googleTokens;
  }

  async handleGoogleAuth() {
    const url = getAuthUrl({
      clientId: this.env.GOOGLE_CLIENT_ID,
      clientSecret: this.env.GOOGLE_CLIENT_SECRET,
      redirectUri: this.env.GOOGLE_REDIRECT_URI
    });
    return Response.redirect(url);
  }

  async handleGoogleCallback(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) return new Response("Missing code", { status: 400 });

    try {
      const tokens = await getTokenFromCode(
        {
          clientId: this.env.GOOGLE_CLIENT_ID,
          clientSecret: this.env.GOOGLE_CLIENT_SECRET,
          redirectUri: this.env.GOOGLE_REDIRECT_URI
        },
        code
      );

      this.googleTokens = tokens;
      await this.ctx.storage.put("google_tokens", tokens);

      return new Response(
        "Google authentication successful! You can close this tab."
      );
    } catch (error) {
      return new Response(`Authentication failed: ${error}`, { status: 500 });
    }
  }

  async checkGoogleAuthStatus() {
    if (!this.googleTokens) {
      // Try to load from storage
      const stored = await this.ctx.storage.get<GoogleToken>("google_tokens");
      if (stored) {
        this.googleTokens = stored;
      }
    }
    return new Response(JSON.stringify({ connected: !!this.googleTokens }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  /**
   * Handles incoming chat messages and manages the response stream
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal }
  ) {
    // const mcpConnection = await this.mcp.connect(
    //   "https://path-to-mcp-server/sse"
    // );

    const google = createGoogleGenerativeAI({
      apiKey: this.env.GEMINI_API_KEY
    });
    const model = google("gemini-3-flash-preview");

    // Initialize all tools
    const allTools = await this.initializeTools();

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Clean up incomplete tool calls to prevent API errors
        const cleanedMessages = cleanupMessages(this.messages);

        // Process any pending tool calls from previous messages
        // This handles human-in-the-loop confirmations for tools
        const processedMessages = await processToolCalls({
          messages: cleanedMessages,
          dataStream: writer,
          tools: allTools,
          executions
        });

        const result = streamText({
          system: `You are a helpful assistant that can do various tasks.
You have access to Google Workspace (Gmail, Calendar, Sheets), Discord, Slack, and Telegram.

${getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool to schedule the task.
`,

          messages: await convertToModelMessages(processedMessages),
          model,
          tools: allTools,
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<
            typeof allTools
          >,
          stopWhen: stepCountIs(10),
          abortSignal: options?.abortSignal
        });

        writer.merge(result.toUIMessageStream());
      }
    });

    return createUIMessageStreamResponse({ stream });
  }
  async executeTask(description: string, _task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        parts: [
          {
            type: "text",
            text: `Running scheduled task: ${description}`
          }
        ],
        metadata: {
          createdAt: new Date()
        }
      }
    ]);
  }

  /**
   * Centralized tool initialization
   */
  async initializeTools() {
    // Initialize Google Tools
    const googleTools = createGoogleTools({
      getToken: async () => this.getValidGoogleToken()
    });

    // Initialize Discord Tools
    const discordTools = createDiscordTools({
      getToken: async () => ({ token: this.env.DISCORD_TOKEN })
    });

    // Initialize Telegram Tools
    const telegramTools = createTelegramTools({
      getToken: async () => ({ token: this.env.TELEGRAM_TOKEN })
    });

    // Initialize Slack Tools
    const slackTools = createSlackTools({
      getToken: async () => ({ token: this.env.SLACK_TOKEN })
    });

    return {
      ...tools,
      ...googleTools,
      ...discordTools,
      ...telegramTools,
      ...slackTools
    };
  }
  /**
   * Handles messages received from external services (Discord, Slack, Telegram)
   */
  async onInboundMessage(message: string, reply: (text: string) => Promise<void>) {
    const google = createGoogleGenerativeAI({
      apiKey: this.env.GEMINI_API_KEY
    });
    const model = google("gemini-1.5-flash");

    // Initialize all tools
    const allTools = await this.initializeTools();

    // 1. Add user message to state
    const userMessage = {
      id: generateId(),
      role: "user" as const,
      parts: [{ type: "text" as const, text: message }],
      metadata: { createdAt: new Date() }
    };
    await this.saveMessages([...this.messages, userMessage]);

    // 2. Generate response
    const result = streamText({
      system: `You are a helpful assistant responding via a messaging app (Discord/Slack/Telegram).
Be concise. You have access to Google Workspace and other tools.`,
      messages: await convertToModelMessages(this.messages),
      model,
      tools: allTools,
      maxSteps: 10,
    });

    // 3. Wait for full text and reply
    const text = await result.text;
    await reply(text);

    // 4. Save AI message to state
    const assistantMessage = {
      id: generateId(),
      role: "assistant" as const,
      parts: [{ type: "text" as const, text }],
      metadata: { createdAt: new Date() }
    };
    await this.saveMessages([...this.messages, assistantMessage]);
  }
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Route Webhooks
    if (url.pathname.startsWith("/webhooks/")) {
      const id = env.Chat.idFromName("default"); // Or extract from URL for multi-tenancy
      const stub = env.Chat.get(id);
      let hookResult: any = null;

      if (url.pathname === "/webhooks/discord") {
        hookResult = await handleDiscordWebhook(request, {
          DISCORD_PUBLIC_KEY: env.DISCORD_PUBLIC_KEY,
          DISCORD_TOKEN: env.DISCORD_TOKEN
        });
      } else if (url.pathname === "/webhooks/slack") {
        hookResult = await handleSlackWebhook(request, {
          SLACK_SIGNING_SECRET: env.SLACK_SIGNING_SECRET,
          SLACK_TOKEN: env.SLACK_TOKEN
        });
      } else if (url.pathname === "/webhooks/telegram") {
        hookResult = await handleTelegramWebhook(request, {
          TELEGRAM_TOKEN: env.TELEGRAM_TOKEN,
          TELEGRAM_SECRET_TOKEN: env.TELEGRAM_SECRET_TOKEN
        });
      }

      if (hookResult instanceof Response) return hookResult;
      if (hookResult && "message" in hookResult) {
        // Background the agent processing to acknowledge the webhook quickly
        _ctx.waitUntil(stub.onInboundMessage(hookResult.message, hookResult.reply));
        return new Response("OK", { status: 200 });
      }
      return new Response("Not Handled", { status: 200 });
    }

    if (url.pathname === "/check-api-key") {
      const hasApiKey = !!process.env.GEMINI_API_KEY;
      return Response.json({
        success: hasApiKey
      });
    }

    if (url.pathname === "/auth/google") {
      const id = env.Chat.idFromName("default");
      const stub = env.Chat.get(id);
      return stub.handleGoogleAuth();
    }

    if (url.pathname === "/auth/google/callback") {
      const id = env.Chat.idFromName("default");
      const stub = env.Chat.get(id);
      return stub.handleGoogleCallback(request);
    }

    if (url.pathname === "/auth/google/status") {
      const id = env.Chat.idFromName("default");
      const stub = env.Chat.get(id);
      return stub.checkGoogleAuthStatus();
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error(
        "GEMINI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
    }
    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;

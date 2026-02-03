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
import { createDiscordTools } from "@cf-agents/discord";
import { createTelegramTools } from "@cf-agents/telegram";
import { createSlackTools } from "@cf-agents/slack";

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

    // Collect all tools
    const allTools = {
      ...tools,
      // ...this.mcp.getAITools(),
      ...googleTools,
      ...discordTools,
      ...telegramTools,
      ...slackTools
    };

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
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

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

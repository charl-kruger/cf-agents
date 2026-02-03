# @cf-agents/google

A Cloudflare Agent integration package for Google Workspace (Gmail, Calendar, and Sheets).

## Features

- **Gmail**: List emails (with search queries) and send emails.
- **Calendar**: List upcoming events and create new events.
- **Sheets**: Read and write to Google Sheets.
- **Authentication**: OAuth 2.0 flow helpers (Auth URL generation, Token Exchange, Token Refresh) and token persistence.
- **Zero-Dependency**: Uses native `fetch` and is compatible with Cloudflare Workers/Durable Objects.

## Installation

Add the package to your agent's `package.json`:

```json
{
  "dependencies": {
    "@cf-agents/google": "workspace:*"
  }
}
```

## Configuration

You need to set up a Google Cloud Project with the **Gmail**, **Google Calendar**, and **Google Sheets** APIs enabled.

### Environment Variables

Ensure your `Env` interface (in `env.d.ts`) includes the following. If you are using Google Gemini models, also include your API key.

```typescript
interface Env {
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string; // e.g., https://your-worker.workers.dev/auth/google/callback

  // AI Model Provider (e.g. Gemini)
  GEMINI_API_KEY: string; 
}
```

### Secrets

Set the secrets in your worker:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REDIRECT_URI
npx wrangler secret put GEMINI_API_KEY
```

## Integration Guide

### 1. Update your Agent Class

In your agent's server file (e.g., `src/server.ts`), import the tools and helpers.

```typescript
import { AIChatAgent } from "@cloudflare/ai-chat";
import { type StreamTextOnFinishCallback, type ToolSet } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google"; // If using Gemini
import {
  createGoogleTools,
  getAuthUrl,
  getTokenFromCode,
  refreshAccessToken,
  type GoogleToken
} from "@cf-agents/google";

export class Chat extends AIChatAgent<Env> {
  // Store tokens in your Durable Object state
  googleTokens: GoogleToken | null = null;

  // Helper to ensure we always have a valid, non-expired token
  async getValidGoogleToken(): Promise<GoogleToken> {
    // 1. Try to load from storage if missing in memory
    if (!this.googleTokens) {
      const stored = await this.ctx.storage.get<GoogleToken>("google_tokens");
      if (stored) this.googleTokens = stored;
    }

    // 2. If still missing, user needs to authenticate
    if (!this.googleTokens) {
      throw new Error("No Google tokens found. Please authenticate first.");
    }

    // 3. Check for expiration and refresh if needed
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

      // Save new tokens
      this.googleTokens = {
        ...newTokens,
        refreshToken: newTokens.refreshToken || this.googleTokens.refreshToken
      };
      await this.ctx.storage.put("google_tokens", this.googleTokens);
    }

    return this.googleTokens;
  }

  // --- Auth Handlers ---

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

      return new Response("Google authentication successful! You can close this tab.");
    } catch (error) {
      return new Response(`Authentication failed: ${error}`, { status: 500 });
    }
  }
  
  // Optional: Endpoint to check if user is connected
  async checkGoogleAuthStatus() {
     if (!this.googleTokens) {
      const stored = await this.ctx.storage.get<GoogleToken>("google_tokens");
      if (stored) this.googleTokens = stored;
    }
    return new Response(JSON.stringify({ connected: !!this.googleTokens }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // --- Chat Loop ---

  async onChatMessage(onFinish: StreamTextOnFinishCallback<ToolSet>) {
    // 1. Initialize Tools with the token getter
    const googleTools = createGoogleTools({
      getToken: async () => this.getValidGoogleToken()
    });
    
    // 2. Setup Model (e.g. Gemini)
    const google = createGoogleGenerativeAI({
      apiKey: this.env.GEMINI_API_KEY
    });
    const model = google("gemini-2.0-flash-exp");

    // 3. Combine tools
    const allTools = {
      ...googleTools,
      // ... other tools
    };

    // 4. Start streaming (standard AI SDK flow)
    // ...
  }
}
```

### 2. Expose Auth Routes

In your worker's `fetch` handler, route requests to your agent methods:

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Auth Routes
    if (url.pathname === "/auth/google") {
      const stub = env.Chat.get(env.Chat.idFromName("default"));
      return stub.handleGoogleAuth();
    }

    if (url.pathname === "/auth/google/callback") {
      const stub = env.Chat.get(env.Chat.idFromName("default"));
      return stub.handleGoogleCallback(request);
    }
    
    // Status Route
    if (url.pathname === "/auth/google/status") {
      const stub = env.Chat.get(env.Chat.idFromName("default"));
      return stub.checkGoogleAuthStatus();
    }

    // ... normal agent routing
    return (await routeAgentRequest(request, env)) || new Response("Not found", { status: 404 });
  }
};
```

### 3. Frontend Integration

You can create a simple button in your UI to trigger the flow:

```tsx
<button onClick={() => window.open("/auth/google", "_blank", "width=600,height=600")}>
  Connect Google
</button>
```

And use the `/auth/google/status` endpoint to show a "Connected" state.

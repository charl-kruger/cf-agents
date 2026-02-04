---
title: Discord Integration
description: Control a Discord Bot from your Cloudflare Agent.
---

The `@cf-agents/discord` package allows your agent to interact with Discord servers using a Bot Token.

## Features

- **SendMessage**: Post messages to specific channels.
- **ReadHistory**: Read the last N messages from a channel to understand context.

## Installation

```bash
npm install @cf-agents/discord
```

## Configuration

Follow these steps to get your Discord integration running.

### 1. Create a Bot in the Discord Portal
1.  Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Create a **New Application**.
3.  Go to **Settings > Bot**:
    - Click **Reset Token** to generate your `DISCORD_TOKEN`.
    - **Important**: Enable **Message Content Intent** under "Privileged Gateway Intents".
4.  Go to **Settings > General Information**:
    - Copy your **Public Key** (`DISCORD_PUBLIC_KEY`).
5.  **Invite the Bot**: Under `OAuth2 > URL Generator`, select `bot` + `Administrator` (or specific permissions like `Send Messages`, `Read Message History`) and use the generated URL to add the bot to your server.

### 2. Set Environment Variables
Add the credentials to your `wrangler.toml` or `.dev.vars`:

```toml
[vars]
DISCORD_TOKEN = "your_bot_token"
DISCORD_PUBLIC_KEY = "your_public_key"
```

## Usage

### 1. Initialize Tools

In your agent's tool initialization logic:

```typescript
import { createDiscordTools } from "@cf-agents/discord";

const discordTools = createDiscordTools({
  getToken: async () => ({
    token: process.env.DISCORD_TOKEN
  }),
  config: {
    channelId: process.env.DISCORD_CHANNEL_ID // Optional default channel
  }
});
```

### Single Channel Mode

You can configure the package to always use a specific Discord channel. When `channelId` is provided in the `config` object during initialization, it becomes optional for the agent in all tool calls.

- If the agent provides a `channelId`, it will override the default.
- If neither is provided, an error will be thrown.

### Tool Definitions

The package exports AI SDK compatible tools. Once added to `streamText`, the LLM can call:

*   `discord_send_message({ channelId?, message })`
*   `discord_read_history({ channelId?, limit })`

### 2. Two-Way Messaging (Webhooks)

To handle incoming Discord interactions (like slash commands or messages) as triggers for your agent, you need to configure a webhook endpoint.

1.  **Public URL**: Ensure your Worker has a public URL (via `wrangler deploy` or a tunnel).
2.  **Discord Portal**: In your Application settings, go to **General Information**.
3.  **Interactions Endpoint URL**: Set this to `https://your-worker.com/webhooks/discord`.
4.  **Verification**: Discord will send a `PONG` request to verify the URL. The `handleDiscordWebhook` helper handles this automatically.

```typescript
import { handleDiscordWebhook } from "@cf-agents/discord";

export default {
  async fetch(request, env) {
    const result = await handleDiscordWebhook(request, {
      DISCORD_PUBLIC_KEY: env.DISCORD_PUBLIC_KEY,
      DISCORD_TOKEN: env.DISCORD_TOKEN
    });

    if (result && "message" in result) {
      // result.message will contain the data from the interaction
      await result.reply("Processing with AI agent...");
    }

    return result instanceof Response ? result : new Response("OK");
  }
}
```
### 3. Registering Commands

Discord needs to know what commands your bot supports. You can register a global `/chat` command using this `curl` command:

```bash
curl -X POST \
  -H "Authorization: Bot YOUR_DISCORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "chat",
    "description": "Talk to the AI Agent",
    "options": [
      {
        "name": "message",
        "description": "The message to send",
        "type": 3,
        "required": true
      }
    ]
  }' \
  "https://discord.com/api/v10/applications/YOUR_APPLICATION_ID/commands"
```

Replace `YOUR_DISCORD_TOKEN` and `YOUR_APPLICATION_ID` with the values from your Discord portal.

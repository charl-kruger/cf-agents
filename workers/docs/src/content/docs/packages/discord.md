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

1.  Create a bot on the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Get your **Bot Token**.
3.  Invite the bot to your server ensuring it has permissions to Read Messages and Send Messages.
4.  Enable "Message Content Intent" in the bot settings if you need to read message content.

## Usage

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

*   `discord_send_message({ channelId?, content })`
*   `discord_read_history({ channelId?, limit })`

### Two-Way Messaging (Webhooks)

You can handle incoming Discord interactions to trigger your agent.

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

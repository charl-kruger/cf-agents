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
  })
});
```

### Tool Definitions

The package exports AI SDK compatible tools. Once added to `streamText`, the LLM can call:

*   `discord_send_message({ channelId, content })`
*   `discord_read_history({ channelId, limit })`

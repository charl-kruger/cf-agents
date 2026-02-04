# @cf-agents/discord

A Cloudflare Agent integration package for Discord.

## Features

-   **Send Messages**: Post messages to channels.
-   **Read History**: Retrieve recent messages from a channel.

## Installation

```json
{
  "dependencies": {
    "@cf-agents/discord": "workspace:*"
  }
}
```

## Configuration & Setup

To use this package, you need a Discord bot and the following credentials: `DISCORD_TOKEN` and `DISCORD_PUBLIC_KEY`.

### 1. Create a Discord Bot
- Go to the [Discord Developer Portal](https://discord.com/developers/applications).
- Click **New Application** and give it a name.
- Under **Settings > Bot**:
    - Click **Reset Token** (or **Copy**) to get your `DISCORD_TOKEN`.
    - **Crucial**: Enable **Message Content Intent** under the "Privileged Gateway Intents" section.
- Under **Settings > General Information**:
    - Copy your **Public Key** to use as `DISCORD_PUBLIC_KEY`.

### 2. Initialize Tools

Initialize the tools with your credentials and an optional default channel.

```typescript
import { createDiscordTools } from "@cf-agents/discord";

const discordTools = createDiscordTools({
  getToken: async () => ({
    token: env.DISCORD_TOKEN // Your Bot Token
  }),
  config: {
    channelId: "OPTIONAL_DEFAULT_CHANNEL_ID"
  }
});
```
## Two-Way Messaging (Webhooks)

Handle incoming Discord interactions (slash commands) to trigger your agent.

```typescript
import { handleDiscordWebhook } from "@cf-agents/discord";

// In your fetch handler
const result = await handleDiscordWebhook(request, {
  DISCORD_PUBLIC_KEY: env.DISCORD_PUBLIC_KEY,
  DISCORD_TOKEN: env.DISCORD_TOKEN
});

if (result && "message" in result) {
  // Process with agent and reply
  await result.reply("Processing your request...");
}
```
### 3. Registering Slash Commands

To test inbound messages, you need to register a command in your Discord Application. Run this `curl` command once (replace placeholders):

```bash
curl -X POST \
  -H "Authorization: Bot YOUR_DISCORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "chat",
    "description": "Talk to the AI Agent",
    "options": [{"name": "message", "description": "The message to send", "type": 3, "required": true}]
  }' \
  "https://discord.com/api/v10/applications/YOUR_APPLICATION_ID/commands"
```

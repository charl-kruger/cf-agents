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

Initialize the tools with your Discord Bot Token and an optional default channel.

```typescript
import { createDiscordTools } from "@cf-agents/discord";

const discordTools = createDiscordTools({
  getToken: async () => ({
    token: "YOUR_BOT_TOKEN"
  }),
  config: {
    channelId: "OPTIONAL_DEFAULT_CHANNEL_ID"
  }
});
```## Two-Way Messaging (Webhooks)

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

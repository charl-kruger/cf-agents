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

## Usage

Initialize the tools with your Discord Bot Token.

```typescript
import { createDiscordTools } from "@cf-agents/discord";

const discordTools = createDiscordTools({
  getToken: async () => ({
    token: "YOUR_BOT_TOKEN"
  })
});
```

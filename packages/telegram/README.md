# @cf-agents/telegram

A Cloudflare Agent integration package for Telegram.

## Features

-   **Send Messages**: Post messages to chats or channels.

## Installation

```json
{
  "dependencies": {
    "@cf-agents/telegram": "workspace:*"
  }
}
```

## Usage

Initialize the tools with your Telegram Bot Token.

```typescript
import { createTelegramTools } from "@cf-agents/telegram";

const telegramTools = createTelegramTools({
  getToken: async () => ({
    token: "YOUR_BOT_TOKEN"
  })
});
```

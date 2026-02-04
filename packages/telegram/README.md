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

Initialize the tools with your Telegram Bot Token and an optional default chat/channel.

```typescript
import { createTelegramTools } from "@cf-agents/telegram";

const telegramTools = createTelegramTools({
  getToken: async () => ({
    token: "YOUR_BOT_TOKEN"
  }),
  config: {
    chatId: "OPTIONAL_DEFAULT_CHAT_ID"
  }
});
```## Two-Way Messaging (Webhooks)

Receive and respond to Telegram messages.

```typescript
import { handleTelegramWebhook } from "@cf-agents/telegram";

// In your fetch handler
const result = await handleTelegramWebhook(request, {
  TELEGRAM_TOKEN: env.TELEGRAM_TOKEN,
  TELEGRAM_SECRET_TOKEN: env.TELEGRAM_SECRET_TOKEN // Optional
});

if (result && "message" in result) {
  // Process with agent and reply
  await result.reply("Message received!");
}
```

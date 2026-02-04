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
```

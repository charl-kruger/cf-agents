---
title: Telegram Integration
description: Send Telegram messages via your Cloudflare Agent.
---

The `@cf-agents/telegram` package enables your agent to send messages to Telegram chats and channels.

## Features

- **SendMessage**: Post text messages to any chat ID the bot has access to.

## Installation

```bash
npm install @cf-agents/telegram
```

## Configuration

1.  Talk to [@BotFather](https://t.me/botfather) on Telegram to create a new bot.
2.  Get your **API Token**.

## Usage

```typescript
import { createTelegramTools } from "@cf-agents/telegram";

const telegramTools = createTelegramTools({
  getToken: async () => ({
    token: process.env.TELEGRAM_TOKEN
  }),
  config: {
    chatId: process.env.TELEGRAM_CHAT_ID // Optional default chat/channel
  }
});
```

### Single Channel Mode

Simplify agent interactions by pre-configuring a target chat or channel. When a `chatId` is set in the `config`, the agent can omit the chat ID in its tool requests.

- Explicitly providing a `chatId` in a tool call will override the default.

### Tool Definitions

The package exports AI SDK compatible tools:

*   `telegram_send_message({ chatId?, text })`

### Two-Way Messaging (Webhooks)

Configure your Telegram Bot webhook to point to your AI agent.

```typescript
import { handleTelegramWebhook } from "@cf-agents/telegram";

export default {
  async fetch(request, env) {
    const result = await handleTelegramWebhook(request, {
      TELEGRAM_TOKEN: env.TELEGRAM_TOKEN,
      TELEGRAM_SECRET_TOKEN: env.TELEGRAM_SECRET_TOKEN
    });

    if (result && "message" in result) {
      await result.reply("Agent is responding...");
    }

    return result instanceof Response ? result : new Response("OK");
  }
}
```

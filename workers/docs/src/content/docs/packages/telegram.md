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
  })
});
```

### Tool Definitions

The package exports AI SDK compatible tools:

*   `telegram_send_message({ chatId, text })`

---
title: Getting Started
description: Learn how to add cf-agents packages to your project.
---

`@cf-agents` is an open-source collection of packages built to extend the capabilities of **Cloudflare Agents**.

While Cloudflare provides the core AI agent platform, `@cf-agents` gives you the high-level tools you need to build real-world applications. Need to read emails, send Slack messages, or manage a Discord server? Just plug these packages directly into your agent's toolset.

## Pre-requisites

- A Cloudflare Workers project (we recommend `npm create cloudflare@latest`)

## Installation

Install the packages you need using your preferred package manager:

```bash
npm install @cf-agents/google @cf-agents/discord
# or
pnpm add @cf-agents/google @cf-agents/discord
```

## Basic Usage

All packages follow a similar pattern:

1.  **Environment Variables**: Configure your API keys and secrets.
2.  **Tool Creation**: Use the `createXTools` helper to generate AI SDK compatible tools.
3.  **Authentication**: Some packages (like Google) require OAuth flows which are handled by helper methods.

### Example

```typescript
import { createDiscordTools } from "@cf-agents/discord";

// inside your Agent's onChatMessage
const discordTools = createDiscordTools({
  getToken: async () => ({ token: this.env.DISCORD_TOKEN }),
});

const result = streamText({
  tools: {
      ...discordTools,
      // ... other tools
  }
  // ...
})
```

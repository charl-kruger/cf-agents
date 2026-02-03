---
title: Getting Started
description: Learn how to add cf-agents packages to your project.
---

`@cf-agents` is an open-source collection of packages built to extend the capabilities of **Cloudflare Agents**.

While Cloudflare provides the core AI agent platform, `@cf-agents` gives you the high-level tools you need to build real-world applications. Need to read emails, send Slack messages, or manage a Discord server? Just plug these packages directly into your agent's toolset.

## Pre-requisites

- A Cloudflare Workers project (we recommend `npm create cloudflare@latest -- --template cloudflare/agents-starter`)
- `pnpm` workspace setup (if integrating multiple packages locally)

## Installation

Add the packages you need to your `package.json`. If you are working in a monorepo structure with these packages locally:

```json
// package.json
{
  "dependencies": {
    "@cf-agents/google": "workspace:*",
    "@cf-agents/discord": "workspace:*",
    "@cf-agents/slack": "workspace:*"
  }
}
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

---
title: Slack Integration
description: Interact with Slack workspaces from your Cloudflare Agent.
---

The `@cf-agents/slack` package allows your agent to post messages and read channel history in Slack.

## Features

- **PostMessage**: Send messages to channels.
- **History**: Read recent conversation history.

## Installation

```bash
npm install @cf-agents/slack
```

## Configuration

1.  Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps).
2.  Add **Bot Token Scopes**:
    *   `chat:write`
    *   `channels:history` (if reading history)
3.  Install the App to your workspace.
4.  Copy the **Bot User OAuth Token** (starts with `xoxb-`).

## Usage

```typescript
import { createSlackTools } from "@cf-agents/slack";

const slackTools = createSlackTools({
  getToken: async () => ({
    token: process.env.SLACK_TOKEN
  }),
  config: {
    channelId: process.env.SLACK_CHANNEL_ID // Optional default channel
  }
});
```

### Single Channel Mode

You can pin the Slack tools to a specific channel. By providing a `channelId` in the `config` during initialization, the agent no longer needs to specify a channel ID in its tool calls.

- The agent can still override the default by providing an explicit `channelId`.
- An error is thrown if no channel is specified or pre-configured.

### Tool Definitions

The package exports AI SDK compatible tools:

*   `slack_post_message({ channelId?, text })`
*   `slack_get_channel_history({ channelId?, limit })`

### Two-Way Messaging (Webhooks)

Set up a Slack Events URL to receive messages directly in your agent.

```typescript
import { handleSlackWebhook } from "@cf-agents/slack";

export default {
  async fetch(request, env) {
    const result = await handleSlackWebhook(request, {
      SLACK_SIGNING_SECRET: env.SLACK_SIGNING_SECRET,
      SLACK_TOKEN: env.SLACK_TOKEN
    });

    if (result && "message" in result) {
      // result.message is the text sent by the user
      await result.reply(`Agent received: ${result.message}`);
    }

    return result instanceof Response ? result : new Response("OK");
  }
}
```

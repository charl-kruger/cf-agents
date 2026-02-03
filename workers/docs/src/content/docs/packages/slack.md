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
  })
});
```

### Tool Definitions

The package exports AI SDK compatible tools:

*   `slack_post_message({ channelId, text })`
*   `slack_get_channel_history({ channelId, limit })`

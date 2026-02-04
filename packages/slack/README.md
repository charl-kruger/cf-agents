# @cf-agents/slack

A Cloudflare Agent integration package for Slack.

## Features

-   **Send Messages**: Post messages to channels using `chat.postMessage`.
-   **Read History**: Retrieve recent messages from a channel using `conversations.history`.

## Installation

```json
{
  "dependencies": {
    "@cf-agents/slack": "workspace:*"
  }
}
```

Initialize the tools with your Slack Bot Token (xoxb-...) and an optional default channel.

```typescript
import { createSlackTools } from "@cf-agents/slack";

const slackTools = createSlackTools({
  getToken: async () => ({
    token: "xoxb-YOUR_BOT_TOKEN"
  }),
  config: {
    channelId: "OPTIONAL_DEFAULT_CHANNEL_ID"
  }
});
```## Two-Way Messaging (Webhooks)

Respond to Slack messages or mentions automatically.

```typescript
import { handleSlackWebhook } from "@cf-agents/slack";

// In your fetch handler
const result = await handleSlackWebhook(request, {
  SLACK_SIGNING_SECRET: env.SLACK_SIGNING_SECRET,
  SLACK_TOKEN: env.SLACK_TOKEN
});

if (result && "message" in result) {
  // Process with agent and reply
  await result.reply(`Hi! I received: ${result.message}`);
}
```

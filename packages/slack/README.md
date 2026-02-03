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

## Usage

Initialize the tools with your Slack Bot Token (xoxb-...).

```typescript
import { createSlackTools } from "@cf-agents/slack";

const slackTools = createSlackTools({
  getToken: async () => ({
    token: "xoxb-YOUR_BOT_TOKEN"
  })
});
```

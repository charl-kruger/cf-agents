---
title: Google Integration
description: Integrate Gmail, Calendar, and Sheets into your Cloudflare Agent.
---

The `@cf-agents/google` package provides a powerful set of tools to let your AI agent interact with Google Workspace.

## Features

- **Gmail**: Read emails, search inboxes, and send emails.
- **Calendar**: Manage events, check availability, and schedule meetings.
- **Sheets**: Read and write data to spreadsheets.
- **Authentication**: Built-in OAuth 2.0 flow helpers for Cloudflare Workers.

## Installation

```bash
npm install @cf-agents/google
# or in a monorepo
pnpm add @cf-agents/google --filter your-worker
```

## Configuration

### Google Cloud Console

1.  Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2.  Enable the **Gmail API**, **Google Calendar API**, and **Google Sheets API**.
3.  Configure the OAuth Consent Screen (add test users if in testing mode).
4.  Create **OAuth Client ID** credentials (Web Application).
    *   **Authorized Redirect URIs**: `https://your-worker.workers.dev/auth/google/callback` (or `http://localhost:8787/auth/google/callback` for local dev).

### Environment Variables

Add these to your `wrangler.toml` or `.dev.vars`:

```toml
[vars]
GOOGLE_CLIENT_ID = "your-client-id"
GOOGLE_CLIENT_SECRET = "your-client-secret"
GOOGLE_REDIRECT_URI = "https://your-worker.workers.dev/auth/google/callback"
```

## Usage

### 1. Initialize Tools

In your agent's `onChatMessage` handler:

```typescript
import { createGoogleTools } from "@cf-agents/google";

const googleTools = createGoogleTools({
  getToken: async () => {
    // Return your stored valid access token here
    // See the 'Authentication' section below for full implementation
  }
});
```

### 2. Authentication Flow

Since Google requires OAuth 2.0, you need to handle the token exchange. This package provides helpers to make this easy in a Cloudflare Worker.

See the [Google Package README](https://github.com/charl-kruger/cf-agents/tree/main/packages/google) for the full code example on implementing `handleGoogleAuth` and `handleGoogleCallback`.

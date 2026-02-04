---
title: Dynamic Workers
description: Create and manage isolated execution environments on the fly.
---

The `@cf-agents/dynamic-workers` package provides a high-level abstraction for Cloudflare's **Dynamic Workers** (also known as Worker Loaders). This allows you to spawn fresh, isolated isolates to execute untrusted or specialized code on the fly.

## Features

- **Genuine Isolation**: Spawns a fresh Cloudflare Worker isolate for每一项任务.
- **Console Capture**: Automatically intercepts and returns all `stdout` and `stderr` logs.
- **Secure Injection**: Pass secrets and variables into the isolated environment's `env`.
- **Resource Control**: Guest workers operate in a sandboxed environment with distinct resource limits.

## Installation

```bash
npm install @cf-agents/dynamic-workers
```

## Cloudflare Requirements

To use dynamic workers, your main Worker needs a `worker_loaders` binding.

### Configure `wrangler.jsonc`

```jsonc
{
  "worker_loaders": [
    {
      "binding": "LOADER"
    }
  ]
}
```

## Usage

### 1. Initialize the Runtime

Pass your `LOADER` binding to the `IsolatedRuntime` class.

```typescript
import { IsolatedRuntime } from "@cf-agents/dynamic-workers";

export default {
  async fetch(request, env) {
    const runtime = new IsolatedRuntime(env.LOADER);
    
    // ... use runtime ...
  }
}
```

### 2. Execute Code

The `execute` method takes a string of code and returns a structured `ExecutionResult`.

```typescript
const result = await runtime.execute(`
  export default {
    async fetch(request, env, ctx) {
      console.log("Isolated worker running!");
      return new Response("Done");
    }
  }
`);

console.log(result.stdout); // "Isolated worker running!"
console.log(result.success); // true
```

### 3. Advanced Configuration

You can lock down networking, inject environment variables, or specify a compatibility date.

```typescript
await runtime.execute(code, {
  env: { STRIPE_KEY: "sk_test_..." },
  allowOutbound: false, // Disables all outbound networking for security
  compatibilityDate: "2024-04-01"
});
```

## When to use Dynamic Workers?

- **Untrusted Code**: Running user-provided scripts or plugins securely.
- **Isolated Side-Effects**: Executing tasks that need to be completely isolated from your main application state.
- **Dynamic Capabilities**: Loading and running specialized logic fetched from GitHub or a database at runtime.

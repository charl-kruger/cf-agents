# @cf-agents/dynamic-workers

A Cloudflare Agent integration package for secure, isolated code execution using Cloudflare Dynamic Workers.

## Features

- **Isolated Execution**: Run untrusted code in a fresh, isolated environment (guest worker).
- **Log Capture**: Automatically capture `console.log` and `console.error` and return them as part of the execution result.
- **Environment Injection**: Inject sensitive secrets and variables into the isolated environment.
- **Networking Control**: Optionally block all outbound networking for maximum security.

## Installation

```bash
npm install @cf-agents/dynamic-workers
```

## Configuration

Initialize the runtime with your Cloudflare `WorkerLoader` binding.

### 1. Requirements

You need the `worker_loaders` binding in your `wrangler.jsonc`:

```jsonc
{
  "worker_loaders": [
    {
      "binding": "LOADER"
    }
  ]
}
```

### 2. Initialization

```typescript
import { IsolatedRuntime } from "@cf-agents/dynamic-workers";

const runtime = new IsolatedRuntime(env.LOADER);
```

## Usage

### basic Execution

```typescript
const result = await runtime.execute(`
  export default {
    async fetch(req) {
      console.log("Processing code...");
      return "Result from isolated worker";
    }
  }
`);

console.log(result.stdout); // "Processing code..."
console.log(result.result); // "Result from isolated worker"
```

### Advanced Isolation

```typescript
const result = await runtime.execute(code, {
  env: { API_KEY: "secret-key" },
  allowOutbound: false, // Lock down networking
  compatibilityDate: "2024-04-01"
});
```

## Why Isolated Workers?

Unlike standard `eval()` or local VMs, Cloudflare Dynamic Workers provide genuine isolation at the edge. Each execution runs in a fresh isolate, ensuring that:
- **No Side Effects**: Code cannot leak state to your main worker.
- **Resource Limits**: guest workers have their own memory and CPU limits.
- **Security**: You can safely run untrusted logic while protecting your environment.

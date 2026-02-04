---
title: Agent Skills
description: Dynamically discover and manage agent capabilities from GitHub.
---

The `@cf-agents/skills` package allows your agent to "learn" new capabilities at runtime by discovering and syncing code from GitHub repositories.

## Features

- **GitHub Discovery**: Automatically find folders containing `SKILL.md` markers.
- **Recursive Syncing**: Downloads all source files from a skill's directory directly to Cloudflare **R2**.
- **Embedded Search**: Automatically indexes skill descriptions in **Vectorize** using Workers AI for instant retrieval.

## Architecture: Why Progressive Disclosure?

The `@cf-agents/skills` package implements a **Two-Tier Discovery** model designed for high-precision agents:

1.  **Tier 1: Global Manifest (Awareness)**:
    We maintain a lightweight `manifest.json` in R2. This gives the agent a complete "catalog" of installed skills (names + short summaries) in the system prompt. Unlike pure vector search, the agent never has to "guess" if it has a capability.
    
2.  **Tier 2: On-Demand Loading (Precision)**:
    When the agent identifies a relevant skill, it calls `loadSkill` to retrieve the full `SKILL.md` instructions. This ensures the environment stays lean, saving tokens and improving accuracy by avoiding context "noise."

### Comparison

| Feature | Pure Vector Search | Progressive Disclosure |
| :--- | :--- | :--- |
| **Awareness** | Blind (requires query) | Conscious (sees catalog) |
| **Token Cost** | Lower (search only) | Minimal (metadata only) |
| **Logic Depth** | Variable | High (loads full manual) |
| **Scale** | Unlimited | Optimized (10-100+ skills) |

---

## Installation

```bash
npm install @cf-agents/skills
```

## Cloudflare Requirements

To use dynamic skills, your Worker requires the following Cloudflare bindings:

1.  **R2 Bucket**: To store the downloaded skill files.
2.  **Vectorize Index**: To index and search skill descriptions.
3.  **Workers AI**: To generate embeddings during the installation process.

### Configure `wrangler.jsonc`

```jsonc
{
  "r2_buckets": [
    {
      "binding": "FILES",
      "bucket_name": "your-skills-storage"
    }
  ],
  "vectorize": [
    {
      "binding": "VECTOR_INDEX",
      "index_name": "your-skills-index"
    }
  ],
  "ai": {
    "binding": "AI"
  }
}
```

## Usage

### 1. Initialize Tools

Initialize the skills tools with your Cloudflare environment bindings.

```typescript
import { createSkillsTools } from "@cf-agents/skills";

export default {
  async fetch(request, env) {
    const skillsTools = createSkillsTools({
      AI: env.AI,
      FILES: env.FILES,
      VECTOR_INDEX: env.VECTOR_INDEX
    });

    // Provide these tools to your agent...
  }
}
```

### 2. Available Tools

Once added to your agent's toolset, the LLM can call:

*   **`addSkill({ url })`**: Pass a GitHub URL (e.g., `https://github.com/owner/repo`) or shorthand (`owner/repo`). The agent will scan for `SKILL.md`, download the folder contents, and update the global manifest.
*   **`loadSkill({ skillName })`**: Fetches the full content of a skill's `SKILL.md` file. Use this when the agent needs specific instructions for a capability it already knows about.
*   **`searchSkills({ query? })`**: Performs a vector search over installed skills to find relevant documentation or logic.
*   **`deleteSkill({ skillName })`**: Removes a skill's files from R2 and deletes its entry from the manifest and index.

## Creating Your Own Skill

A skill is defined by a directory in a GitHub repository that contains a **`SKILL.md`** file.

1.  Create a folder in your repo (e.g., `my-custom-skill/`).
2.  Add a `SKILL.md` file describing what the skill does.
3.  Place any logic, prompt snippets, or configuration inside that same folder.

When `addSkill` is called on that repository, the agent will discover your folder and sync everything inside it.

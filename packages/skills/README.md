# @cf-agents/skills

A Cloudflare Agent integration package for dynamic capability discovery and management.

## Features

- **GitHub Discovery**: Automatically find and pull skills from repositories using `SKILL.md` markers.
- **Recursive Sync**: Seamlessly download and store skill files in Cloudflare R2.
- **Vector Indexing**: Embedded search via Workers AI and Vectorize.

## Installation

```bash
npm install @cf-agents/skills
```

## Configuration

Initialize the tools with your Cloudflare environment bindings.

### 1. Requirements

You need the following bindings in your `wrangler.jsonc`:

```jsonc
{
  "r2_buckets": [
    {
      "binding": "FILES",
      "bucket_name": "your-skills-bucket"
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

### 2. Initialization

```typescript
import { createSkillsTools } from "@cf-agents/skills";

const skillsTools = createSkillsTools({
  AI: env.AI,
  FILES: env.FILES, // Your R2 bucket
  VECTOR_INDEX: env.VECTOR_INDEX,
  githubToken: env.GITHUB_TOKEN // Optional: for private repos & higher rate limits
});
```

> [!TIP]
> Always store your `GITHUB_TOKEN` as a secret (e.g., in `.dev.vars` locally or via `wrangler secret put` in production).

## Usage

Once added to your agent's toolset, the LLM can:

-   `addSkill({ url })`: Point the agent to a GitHub repo (or `owner/repo`) to learn new capabilities.
-   `loadSkill({ skillName })`: Loads the full content and specialized instructions for a skill.
-   `searchSkills({ query? })`: Find documentation or specific logic in already installed skills.
-   `deleteSkill({ skillName })`: Uninstall/remove a capability.

## Architecture: Progressive Disclosure

This package follows the **Progressive Disclosure** pattern for skill discovery, similar to industry leaders like OpenCode and Cursor.

### Why this method?

We use a two-tier approach (Global Manifest + On-Demand Loading) instead of relying solely on pure vector search:

1.  **Eliminating "Agent Blindness"**: In pure vector systems, an agent must guess a search query before it even knows what skills exist. By maintaining a global `manifest.json`, the agent is presented with a "menu" of capabilities from the start.
2.  **Token Efficiency**: Loading the full implementation logic for every skill into every request is expensive and noisy. This architecture allows the agent to see a 1-sentence summary, decide if it's relevant, and only then use `loadSkill` to "read the manual."
3.  **Precision & Scalability**: Small-to-medium skill sets (10-50) work significantly better when the LLM can see the complete catalog. For larger sets, the integrated **Vectorize** layer remains available for deep documentation retrieval.

---

## Creating a Skill

A skill is simply a folder in a GitHub repository containing a **`SKILL.md`** file.

### Required Format

The `SKILL.md` file should describe the capability. The agent uses the first 1,000 characters of this file for vector indexing.

```markdown
# My New Skill
This skill allows the agent to handle custom business logic for...
```

The agent will discover this marker, download the entire folder contents to R2, and index the description for search.

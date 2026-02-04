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
  VECTOR_INDEX: env.VECTOR_INDEX
});
```

## Usage

Once added to your agent's toolset, the LLM can:

-   `addSkill({ url })`: Point the agent to a GitHub repo (or `owner/repo`) to learn new capabilities.
-   `loadSkill({ skillName })`: Loads the full content and specialized instructions for a skill.
-   `searchSkills({ query? })`: Find documentation or specific logic in already installed skills.
-   `deleteSkill({ skillName })`: Uninstall/remove a capability.

## Creating a Skill

A skill is simply a folder in a GitHub repository containing a **`SKILL.md`** file.

### Required Format

The `SKILL.md` file should describe the capability. The agent uses the first 1,000 characters of this file for vector indexing.

```markdown
# My New Skill
This skill allows the agent to handle custom business logic for...
```

The agent will discover this marker, download the entire folder contents to R2, and index the description for search.

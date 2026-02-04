import { tool } from "ai";
import { z } from "zod";
import { Ai, R2Bucket, VectorizeIndex } from "@cloudflare/workers-types";

/**
 * Interface for the required Cloudflare Bindings and AI capabilities
 */
export interface SkillContext {
    /** Cloudflare Workers AI binding for embeddings */
    AI: Ai;
    /** Cloudflare R2 binding for file storage */
    FILES: R2Bucket;
    /** Cloudflare Vectorize binding for skill indexing */
    VECTOR_INDEX: VectorizeIndex;
}

/**
 * Helper to parse GitHub URL into owner, repo, branch, path
 */
function parseGithubUrl(url: string) {
    try {
        const u = new URL(url);
        if (u.hostname !== "github.com") return null;
        const pathParts = u.pathname.split("/").filter(Boolean);
        if (pathParts.length < 2) return null;
        const [owner, repo, type, ref, ...rest] = pathParts;

        let branch = "main";
        let subpath = "";

        if (type === "tree" || type === "blob") {
            branch = ref;
            subpath = rest.join("/");
        } else if (type) {
            // repo/path format without "tree"
            subpath = [type, ref, ...rest].join("/");
        }

        return {
            owner,
            repo: repo.replace(/\.git$/, ""),
            branch,
            path: subpath
        };
    } catch (e) {
        return null;
    }
}

/**
 * Fetch the entire repository tree recursively using GitHub Git Trees API
 */
async function fetchGithubTree(owner: string, repo: string, branch: string) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const res = await fetch(apiUrl, {
        headers: {
            "User-Agent": "cf-agents-skills-package"
        }
    });
    if (!res.ok) {
        if (res.status === 404 && branch === "main") {
            // Try 'master' if 'main' fails
            return fetchGithubTree(owner, repo, "master");
        }
        throw new Error(`GitHub API Error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json() as { tree: Array<{ path: string, type: string, url: string, size?: number }> };
    return data.tree;
}

export const createSkillsTools = (context: SkillContext) => {
    return {
        addSkill: tool({
            description: "Adds a capability/skill from GitHub repositories by discovering SKILL.md files.",
            parameters: z.object({
                url: z.string().describe("The GitHub URL (https://github.com/owner/repo) OR shorthand (owner/repo).")
            }),
            execute: async ({ url }) => {
                if (!url) {
                    return "Error: URL argument is required.";
                }

                // Support shorthand
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = `https://github.com/${url}`;
                }

                const parsed = parseGithubUrl(url);
                if (!parsed) return "Invalid GitHub URL.";

                const { owner, repo, branch, path: requestedPath } = parsed;

                try {
                    const tree = await fetchGithubTree(owner, repo, branch);
                    const skillMarkers = tree.filter(node => node.path.endsWith("/SKILL.md") || node.path === "SKILL.md");

                    if (skillMarkers.length === 0) {
                        return "No valid skills found. Skills require a SKILL.md file.";
                    }

                    let selectedSkillMarker = skillMarkers.find(m => {
                        const dir = m.path === "SKILL.md" ? "" : m.path.replace("/SKILL.md", "");
                        return dir === requestedPath;
                    });

                    if (!selectedSkillMarker && requestedPath) {
                        const subSkills = skillMarkers.filter(m => m.path.startsWith(requestedPath + "/"));
                        if (subSkills.length === 1) {
                            selectedSkillMarker = subSkills[0];
                        } else if (subSkills.length > 1) {
                            const options = subSkills.map((m) => m.path.replace("/SKILL.md", ""));
                            return JSON.stringify({ status: "multiple_found", skills: options, url: url });
                        }
                    }

                    if (!selectedSkillMarker) {
                        if (skillMarkers.length === 1) {
                            selectedSkillMarker = skillMarkers[0];
                        } else {
                            const options = skillMarkers.map((m) => m.path.replace("/SKILL.md", ""));
                            return JSON.stringify({ status: "multiple_found", skills: options, url: url });
                        }
                    }

                    const skillFolderPath = selectedSkillMarker.path === "SKILL.md" ? "" : selectedSkillMarker.path.replace("/SKILL.md", "");
                    const skillName = skillFolderPath.split("/").pop() || repo;

                    const filesToDownload = tree.filter(node => {
                        if (node.type !== "blob") return false;
                        return node.path === skillFolderPath || node.path.startsWith(skillFolderPath + "/");
                    });

                    let skillDescription = "";
                    let foundSkillMd = false;

                    for (const fileNode of filesToDownload) {
                        const fileName = skillFolderPath === "" ? fileNode.path : fileNode.path.replace(skillFolderPath + "/", "");
                        const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileNode.path}`;
                        const contentRes = await fetch(downloadUrl);
                        if (!contentRes.ok) continue;

                        const content = await contentRes.text();
                        await context.FILES.put(`skills/${skillName}/${fileName}`, content);

                        if (fileName === "SKILL.md") {
                            foundSkillMd = true;
                            skillDescription = content.slice(0, 1000);
                        }
                    }

                    if (!foundSkillMd) {
                        return `Error: Failed to download SKILL.md for ${skillName}`;
                    }

                    // Vector Embed & Index
                    const { data } = (await context.AI.run("@cf/baai/bge-base-en-v1.5", {
                        text: [skillDescription]
                    })) as { data: number[][] };

                    const embedding = data[0];

                    await context.VECTOR_INDEX.upsert([
                        {
                            id: skillName,
                            values: embedding,
                            metadata: {
                                type: "skill",
                                name: skillName,
                                url: url,
                                path: skillFolderPath,
                                description: skillDescription.slice(0, 200)
                            }
                        }
                    ]);

                    return `Successfully installed skill: ${skillName}`;
                } catch (error: any) {
                    return `Failed to install skill: ${error.message}`;
                }
            }
        }),

        deleteSkill: tool({
            description: "Uninstalls a skill, removing its files and indexing metadata.",
            parameters: z.object({
                skillName: z.string().describe("The name of the skill to delete.")
            }),
            execute: async ({ skillName }) => {
                try {
                    await context.VECTOR_INDEX.deleteByIds([skillName]);
                    let cursor: string | undefined;
                    let deletedCount = 0;

                    do {
                        const list = await context.FILES.list({ prefix: `skills/${skillName}/`, cursor });
                        if (list.objects.length > 0) {
                            const keysToDelete = list.objects.map((o: any) => o.key);
                            await context.FILES.delete(keysToDelete);
                            deletedCount += keysToDelete.length;
                        }
                        cursor = list.truncated ? list.cursor : undefined;
                    } while (cursor);

                    return `Successfully deleted skill '${skillName}'.`;
                } catch (error: any) {
                    return `Failed to delete skill: ${error.message}`;
                }
            }
        }),

        searchSkills: tool({
            description: "Search for locally installed skills and their documentation.",
            parameters: z.object({
                query: z.string().optional().describe("The search query. If omitted, lists available skills.")
            }),
            execute: async ({ query }) => {
                const searchQuery = query || "skill";
                const { data } = (await context.AI.run("@cf/baai/bge-base-en-v1.5", {
                    text: [searchQuery]
                })) as { data: number[][] };

                const embedding = data[0];
                let matches = await context.VECTOR_INDEX.query(embedding, {
                    topK: 10,
                    filter: { type: "skill" },
                    returnMetadata: "all"
                });

                if (matches.matches.length === 0) {
                    return "No installed skills found.";
                }

                return matches.matches
                    .map((m) => `Skill: ${m.id}\nDescription: ${(m.metadata as any)?.description || "No description"}`)
                    .join("\n\n");
            }
        })
    };
};

import { WorkerLoader } from "@cloudflare/workers-types";

export interface IsolatedRuntimeOptions {
    /** Compatibility date for the guest worker */
    compatibilityDate?: string;
    /** Environment variables to inject into the isolated worker */
    env?: Record<string, string>;
    /** Whether to allow outbound networking from the isolated worker */
    allowOutbound?: boolean;
}

export interface ExecutionResult {
    /** Standard output from the execution */
    stdout: string;
    /** Standard error/exception details from the execution */
    stderr: string;
    /** The serialized result of the execution */
    result: string;
    /** Whether the execution was successful */
    success: boolean;
}

/**
 * IsolatedRuntime provides a high-level API to execute code in an isolated Cloudflare Worker.
 */
export class IsolatedRuntime {
    constructor(private loader: WorkerLoader) { }

    /**
     * Executes a snippet of JavaScript/TypeScript code in an isolated worker.
     * The code must export a default object with a fetch handler or a run function.
     */
    async execute(code: string, options: IsolatedRuntimeOptions = {}): Promise<ExecutionResult> {
        const workerId = crypto.randomUUID();
        const compatibilityDate = options.compatibilityDate || "2024-03-20";

        try {
            const worker = this.loader.get(workerId, async () => {
                return {
                    compatibilityDate,
                    mainModule: "index.js",
                    modules: {
                        "index.js": {
                            js: `
                                export default {
                                    async fetch(request, env, ctx) {
                                        const logs = [];
                                        const errors = [];
                                        
                                        // Capture console output
                                        const originalLog = console.log;
                                        const originalError = console.error;
                                        console.log = (...args) => logs.push(args.map(String).join(" "));
                                        console.error = (...args) => errors.push(args.map(String).join(" "));
                                        
                                        try {
                                            const userModule = await import("./user-code.js");
                                            let result;
                                            
                                            if (userModule.default && typeof userModule.default.fetch === 'function') {
                                                const res = await userModule.default.fetch(request, env, ctx);
                                                result = await res.text();
                                            } else if (typeof userModule.run === 'function') {
                                                const args = await request.json().catch(() => ({}));
                                                result = await userModule.run(args, env, ctx);
                                            } else {
                                                result = userModule.default;
                                            }

                                            return Response.json({
                                                stdout: logs.join("\\n"),
                                                stderr: errors.join("\\n"),
                                                result: typeof result ==='string' ? result : JSON.stringify(result),
                                                success: true
                                            });
                                        } catch (e) {
                                            const stack = e instanceof Error ? e.stack : '';
                                            return Response.json({
                                                stdout: logs.join("\\n"),
                                                stderr: errors.join("\\n"),
                                                result: e.toString() + "\\n" + stack,
                                                success: false
                                            });
                                        } finally {
                                            console.log = originalLog;
                                            console.error = originalError;
                                        }
                                    }
                                }
                            `
                        },
                        "user-code.js": {
                            js: code
                        }
                    },
                    env: options.env,
                    globalOutbound: options.allowOutbound ? undefined : null
                };
            });

            const response = await worker.fetch("http://runtime.local", {
                method: "POST",
                body: JSON.stringify({})
            });

            if (!response.ok) {
                return {
                    stdout: "",
                    stderr: `Runtime fetch failed: ${response.status} ${await response.text()}`,
                    result: "",
                    success: false
                };
            }

            return await response.json() as ExecutionResult;
        } catch (e: any) {
            return {
                stdout: "",
                stderr: `Internal Runtime Error: ${e.message}`,
                result: "",
                success: false
            };
        }
    }
}

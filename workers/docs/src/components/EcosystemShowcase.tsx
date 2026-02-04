import { useEffect, useState } from 'react';

type Stage = 'terminal' | 'editor';

type TerminalLine = {
  text: string;
  kind?: 'success' | 'muted' | 'command';
};

type Token = { text: string; kind: string };

const TERMINAL_SCRIPT: Array<TerminalLine & { delay: number }> = [
  { text: 'pnpm add @cf-agents/google', kind: 'command', delay: 700 },
  { text: 'Resolving packages...', kind: 'muted', delay: 600 },
  { text: 'Downloading @cf-agents/google@0.0.5', kind: 'muted', delay: 650 },
  { text: 'Linked 2 binaries.', kind: 'muted', delay: 520 },
  { text: '✓ Installed @cf-agents/google', kind: 'success', delay: 820 },
  { text: '✨ Ready to use in your Worker', kind: 'success', delay: 620 },
];

const WORKER_CODE = [
  'import { AgentRuntime } from "@cf-agents/core";',
  'import { gmailTool } from "@cf-agents/google";',
  '',
  'export default {',
  '  async fetch(request: Request, env: Env) {',
  '    const runtime = new AgentRuntime({',
  '      tools: [gmailTool({ token: env.GOOGLE_TOKEN })]',
  '    });',
  '',
  '    const result = await runtime.run({',
  "      messages: [{ role: 'user', content: 'What is on my calendar?' }]",
  '    });',
  '',
  '    return Response.json(result.responses);',
  '  },',
  '};',
];

const ENV_CODE = [
  'interface Env {',
  '  /** Google OAuth Token */',
  '  GOOGLE_TOKEN: string;',
  '',
  '  /** Discord Bot Token */',
  '  DISCORD_TOKEN: string;',
  '',
  '  /** Chat Durable Object */',
  '  Chat: DurableObjectNamespace;',
  '}',
];

const KEYWORDS = new Set([
  'import', 'from', 'const', 'export', 'default', 'async', 'await',
  'return', 'new', 'interface', 'string', 'type'
]);

function tokenizeLine(line: string): Token[] {
  if (line.trim().length === 0) return [{ text: line, kind: 'ws' }];

  const tokens: Token[] = [];
  const commentIdx = line.indexOf('//');
  const jsDocIdx = line.indexOf('/**');
  const blockCommentIdx = line.indexOf('*/');

  if (jsDocIdx >= 0 || jsDocIdx >= 0 || blockCommentIdx >= 0) {
    // Simple handling for Doc comments
    return [{ text: line, kind: 'comment' }];
  }

  const commentStart = line.indexOf('//');
  const codePart = commentStart >= 0 ? line.slice(0, commentStart) : line;
  const commentPart = commentStart >= 0 ? line.slice(commentStart) : '';

  const re = /(\s+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[A-Za-z_]\w*\b|\d+(?:\.\d+)?|[()[\]{}.,;:]|=>|==|===|!=|!==|\+|-|\*|\/|<|>)/g;

  let last = 0;
  for (const match of codePart.matchAll(re)) {
    const idx = match.index ?? 0;
    if (idx > last) tokens.push({ text: codePart.slice(last, idx), kind: 'plain' });

    const part = match[0];
    let kind = 'plain';
    if (/^\s+$/.test(part)) kind = 'ws';
    else if (/^["'`]/.test(part)) kind = 'string';
    else if (/^\d/.test(part)) kind = 'number';
    else if (KEYWORDS.has(part)) kind = 'keyword';
    else if (/^[()[\]{}.,;:]$/.test(part) || part === '=>') kind = 'punct';
    else if (/^[A-Za-z_]\w*$/.test(part)) kind = 'ident';

    tokens.push({ text: part, kind });
    last = idx + part.length;
  }
  if (last < codePart.length) tokens.push({ text: codePart.slice(last), kind: 'plain' });
  if (commentPart) tokens.push({ text: commentPart, kind: 'comment' });

  return tokens;
}

export default function EcosystemShowcase() {
  const [stage, setStage] = useState<Stage>('terminal');
  const [activeTab, setActiveTab] = useState<'worker' | 'env'>('worker');
  const [lines, setLines] = useState<TerminalLine[]>([]);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const runSequence = () => {
      setStage('terminal');
      setLines([]);
      setActiveTab('worker');

      let cumulative = 0;
      TERMINAL_SCRIPT.forEach((line) => {
        cumulative += line.delay;
        timeouts.push(
          setTimeout(() => {
            setLines((prev) => [...prev, line]);
          }, cumulative),
        );
      });

      const showEditorAt = cumulative + 900;
      const switchTabAt = showEditorAt + 3500;
      const restartAt = showEditorAt + 7500;

      timeouts.push(
        setTimeout(() => {
          setStage('editor');
        }, showEditorAt),
      );

      timeouts.push(
        setTimeout(() => {
          setActiveTab('env');
        }, switchTabAt),
      );

      timeouts.push(
        setTimeout(() => {
          runSequence();
        }, restartAt),
      );
    };

    runSequence();

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const currentCode = activeTab === 'worker' ? WORKER_CODE : ENV_CODE;

  return (
    <section className="ecosystem-showcase">
      <div className="ecosystem-copy">
        <p className="eyebrow">The @cf-agents Ecosystem</p>
        <h2>Integration shouldn't be a side-quest.</h2>
        <p className="lede">
          Your agent has work to do. We’ve automated the boilerplate so you can skip the plumbing
          and move straight to the logic. Turn integration hell into a minor configuration detail.
        </p>
        <div className="pill-row">
          <span className="pill">Cloudflare-native</span>
          <span className="pill">Typed tooling</span>
          <span className="pill">Agent-ready</span>
        </div>
      </div>

      <div className="ecosystem-visual">
        <div className={`terminal-shell ${stage === 'terminal' ? 'active' : ''}`}>
          <div className="shell-header">
            <div className="traffic-lights">
              <span />
              <span />
              <span />
            </div>
            <span className="shell-title">terminal · pnpm</span>
          </div>
          <div className="shell-body">
            {lines.map((line, idx) => (
              <div className={`shell-line ${line.kind ?? ''}`} key={`${line.text}-${idx}`}>
                <span className="prompt">{line.kind === 'command' ? '$' : '›'}</span>
                <span>{line.text}</span>
              </div>
            ))}
            {stage === 'terminal' ? <div className="ecosystem-shell-cursor" /> : null}
          </div>
        </div>

        <div className={`editor-shell ${stage === 'editor' ? 'active' : ''}`}>
          <div className="editor-chrome">
            <div className="editor-left">
              <span className="editor-dot" />
              <span className="editor-dot" />
              <span className="editor-dot" />
            </div>
            <div className="editor-tabs">
              <div className={`tab ${activeTab === 'worker' ? 'active' : ''}`} onClick={() => setActiveTab('worker')}>
                <span className="file-icon ts">TS</span>
                worker.ts
              </div>
              <div className={`tab ${activeTab === 'env' ? 'active' : ''}`} onClick={() => setActiveTab('env')}>
                <span className="file-icon ts">TS</span>
                env.d.ts
              </div>
            </div>
            <div className="editor-spacer" />
          </div>

          <div className="editor-layout">
            <div className="editor-sidebar">
              <div className="sidebar-icon active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
              </div>
              <div className="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
              </div>
              <div className="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20m10-10H2"></path></svg>
              </div>
            </div>

            <div className="editor-main">
              <div className="editor-breadcrumbs">
                src <span className="sep">/</span> {activeTab === 'worker' ? 'worker.ts' : 'env.d.ts'}
              </div>
              <div className="editor-body">
                <div className="line-gutter">
                  {currentCode.map((_, i) => (
                    <div key={i} className="line-number">{i + 1}</div>
                  ))}
                </div>
                <div className="code-content">
                  {currentCode.map((line, idx) => (
                    <div className={`code-line ${activeTab === 'worker' && idx === 6 ? 'highlight' : ''}`} key={`${activeTab}-${idx}`}>
                      <span className="code-text">
                        {tokenizeLine(line).map((t, i) => (
                          <span className={`tok ${t.kind}`} key={`${idx}-${i}-${t.kind}`}>
                            {t.text}
                          </span>
                        ))}
                        {activeTab === 'worker' && idx === 6 && <span className="ecosystem-caret" />}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="editor-status">
            <span className="status-item">main*</span>
            <span className="status-sep" />
            <span className="status-item">UTF-8</span>
            <span className="status-sep" />
            <span className="status-item">TypeScript JSX</span>
          </div>
        </div>

        <div className="stage-indicators">
          <span className={`dot ${stage === 'terminal' ? 'on' : ''}`}>Install</span>
          <span className={`dot ${stage === 'editor' ? 'on' : ''}`}>Ship</span>
        </div>
      </div>
    </section>
  );
}

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

const CODE_SNIPPET = [
  'import { AgentRuntime } from "@cf-agents/core";',
  'import { gmailTool } from "@cf-agents/google";',
  '',
  'const runtime = new AgentRuntime({',
  '  tools: [gmailTool()],',
  '});',
  '',
  'export default {',
  '  async fetch(request: Request) {',
  "    const result = await runtime.run({",
  "      messages: [{ role: 'user', content: 'Send a status email' }],",
  '    });',
  '',
  '    return Response.json(result.completions);',
  '  },',
  '};',
];

const KEYWORDS = new Set([
  'import',
  'from',
  'const',
  'export',
  'default',
  'async',
  'await',
  'return',
  'new',
]);

function tokenizeLine(line: string): Token[] {
  if (line.trim().length === 0) return [{ text: line, kind: 'ws' }];

  // Very small TS/JS-ish tokenizer for a “code editor” feel.
  const tokens: Token[] = [];

  // Handle inline comments.
  const commentIdx = line.indexOf('//');
  const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

  const re =
    /(\s+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[A-Za-z_]\w*\b|\d+(?:\.\d+)?|[()[\]{}.,;:]|=>|==|===|!=|!==|\+|-|\*|\/|<|>)/g;

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
  const [lines, setLines] = useState<TerminalLine[]>([]);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const runSequence = () => {
      setStage('terminal');
      setLines([]);

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
      const restartAt = showEditorAt + 5200;

      timeouts.push(
        setTimeout(() => {
          setStage('editor');
        }, showEditorAt),
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

  return (
    <section className="ecosystem-showcase">
      <div className="ecosystem-copy">
        <p className="eyebrow">The @cf-agents Ecosystem</p>
        <h2>Install, connect, and ship in minutes.</h2>
        <p className="lede">
          Watch the flow from install to production. Drop in a package, then use it in your Worker
          without wiring a thing.
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
            <div className="tab active">worker.ts</div>
            <div className="tab muted">env.d.ts</div>
            <div className="editor-spacer" />
            <div className="editor-badge">TypeScript</div>
          </div>
          <div className="editor-body">
            {CODE_SNIPPET.map((line, idx) => (
              <div className={`code-line ${idx === 8 ? 'active' : ''}`} key={`${idx}-${line}`}>
                <span className="line-number">{idx + 1}</span>
                <span className="code-text">
                  {tokenizeLine(line).map((t, i) => (
                    <span className={`tok ${t.kind}`} key={`${idx}-${i}-${t.kind}`}>
                      {t.text}
                    </span>
                  ))}
                  {idx === 8 ? <span className="ecosystem-caret" /> : null}
                </span>
              </div>
            ))}
          </div>
          <div className="editor-status">
            <span className="status-item">main</span>
            <span className="status-sep" />
            <span className="status-item">Workers</span>
            <span className="status-sep" />
            <span className="status-item">UTF-8</span>
          </div>
        </div>

        <div className="stage-indicators">
          <span className={`dot ${stage === 'terminal' ? 'on' : ''}`}>Install</span>
          <span className={`dot ${stage === 'editor' ? 'on' : ''}`}>Wire up</span>
        </div>
      </div>
    </section>
  );
}


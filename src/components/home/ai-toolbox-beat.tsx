import { TerminalSection } from '@/components/home/terminal-section';

const CHIPS = [
  'Claude Code',
  'GitHub Copilot',
  'Windsurf / Cascade',
  'MCP: Context7',
  'MCP: SequentialThinking',
  'MCP: Figma',
  'MCP: Memory',
  'MCP: Markitdown',
  'MCP: chrome-devtools',
  'prompt & context engineering',
  'skills: superpowers',
  'skills: mattpocock',
];

export function AiToolboxBeat() {
  return (
    <TerminalSection command="cat ./ai-toolbox">
      <p className="max-w-2xl leading-relaxed text-fg">
        I don&apos;t just use AI tools — I deploy them into teams.
      </p>
      <ul className="mt-6 flex max-w-3xl flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <li
            className="rounded border border-edge bg-surface px-3 py-1 font-mono text-xs text-fg-muted"
            key={chip}
          >
            {chip}
          </li>
        ))}
      </ul>
    </TerminalSection>
  );
}

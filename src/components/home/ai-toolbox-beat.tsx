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

export const AiToolboxBeat = () => (
  <TerminalSection command="cat ./ai-toolbox">
    <p className="text-fg max-w-2xl leading-relaxed">
      I don&apos;t just use AI tools — I deploy them into teams.
    </p>
    <ul className="mt-6 flex max-w-3xl flex-wrap gap-2">
      {CHIPS.map((chip) => (
        <li
          className="border-edge bg-surface text-fg-muted rounded border px-3 py-1 font-mono text-xs"
          key={chip}
        >
          {chip}
        </li>
      ))}
    </ul>
  </TerminalSection>
);

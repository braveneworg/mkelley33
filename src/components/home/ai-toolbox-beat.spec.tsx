/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { AiToolboxBeat } from '@/components/home/ai-toolbox-beat';

describe('AiToolboxBeat', () => {
  it('renders the intro line and key chips', () => {
    render(<AiToolboxBeat />);
    expect(screen.getByText('cat ./ai-toolbox')).toBeInTheDocument();
    expect(
      screen.getByText(/I don't just use AI tools — I deploy them into teams\./)
    ).toBeInTheDocument();
    for (const chip of [
      'Claude Code',
      'GitHub Copilot',
      'Windsurf / Cascade',
      'MCP: Context7',
      'prompt & context engineering',
      'skills: superpowers',
    ]) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
  });
});

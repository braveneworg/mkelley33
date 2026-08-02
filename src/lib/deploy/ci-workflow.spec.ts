/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { deployJobSteps, stepsForJob } from '@/lib/deploy/ci-workflow';

const WORKFLOW = `
name: CI
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm lint
  deploy:
    runs-on: ubuntu-latest
    steps:
      # never run vercel build on the runner — comments must not read as steps
      - name: Pull env
        run: vercel pull --yes
      - run: vercel deploy --prod
`;

describe('stepsForJob', () => {
  it('returns the requested job steps in file order', () => {
    expect(stepsForJob(WORKFLOW, 'deploy')).toEqual([
      { name: 'Pull env', run: 'vercel pull --yes' },
      { run: 'vercel deploy --prod' },
    ]);
  });

  it('keeps uses steps addressable', () => {
    expect(stepsForJob(WORKFLOW, 'ci')[0]).toEqual({ uses: 'actions/checkout@v4' });
  });

  it('never surfaces a comment as a step', () => {
    const runs = stepsForJob(WORKFLOW, 'deploy').map((step) => step.run ?? '');
    expect(runs.filter((run) => run.includes('vercel build'))).toEqual([]);
  });

  it('returns no steps for a job that declares none', () => {
    expect(stepsForJob('jobs:\n  deploy:\n    runs-on: ubuntu-latest\n', 'deploy')).toEqual([]);
  });

  it('throws when the job is absent, never an empty step list', () => {
    expect(() => stepsForJob(WORKFLOW, 'release')).toThrow(/release/);
  });

  it('throws on a source with no jobs table', () => {
    expect(() => stepsForJob('name: CI\n', 'deploy')).toThrow();
  });
});

describe('deployJobSteps', () => {
  it('reads the deploy job out of the real workflow', () => {
    const runs = deployJobSteps().map((step) => step.run ?? '');
    expect(runs.some((run) => run.includes('vercel deploy'))).toBe(true);
  });
});

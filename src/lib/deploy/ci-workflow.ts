/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { readFileSync } from 'node:fs';

import { parse } from 'yaml';
import { z } from 'zod';

/**
 * Reads GitHub workflow jobs as structured step lists so repo-policy specs
 * assert over steps — presence, order, absence — instead of regex-slicing
 * the file's text. The predecessor guard did the latter, and its ordering
 * assertion compared `indexOf` results: deleting the step it protected made
 * both sides -1-adjacent and the guard passed. Steps make that class of
 * false negative unrepresentable — a missing step is a thrown error or a
 * failed find, never a smaller index.
 */

const stepSchema = z.object({
  name: z.string().optional(),
  run: z.string().optional(),
  uses: z.string().optional(),
});

const workflowSchema = z.object({
  jobs: z.record(z.string(), z.object({ steps: z.array(stepSchema).optional() })),
});

export interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
}

/**
 * Steps of one job, in file order. Throws when the source is not a workflow
 * (no `jobs` table) or the job id is absent — a caller asserting over a job
 * can never silently receive someone else's (or nobody's) steps. A job that
 * declares no `steps` returns an empty list.
 */
export const stepsForJob = (source: string, jobId: string): WorkflowStep[] => {
  const { jobs } = workflowSchema.parse(parse(source));
  const job = Object.entries(jobs).find(([id]) => id === jobId)?.[1];
  if (!job) {
    throw new Error(`job "${jobId}" not found in workflow`);
  }
  return job.steps ?? [];
};

/** The production deploy job from the repo's single workflow file. */
export const deployJobSteps = (): WorkflowStep[] =>
  stepsForJob(readFileSync('.github/workflows/ci.yml', 'utf8'), 'deploy');

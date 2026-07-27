/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CollectionBeforeChangeHook } from 'payload';

interface LexicalNode {
  children?: unknown;
  text?: unknown;
}

export const extractLexicalText = (state: unknown): string => {
  const parts: string[] = [];
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== 'object') {
      return;
    }
    const { children, text } = node as LexicalNode;
    if (typeof text === 'string') {
      parts.push(text);
    }
    if (Array.isArray(children)) {
      children.forEach(visit);
    }
  };
  const root =
    state !== null && typeof state === 'object' ? (state as { root?: unknown }).root : undefined;
  visit(root);
  return parts.join(' ');
};

export const readTimeMinutes = (state: unknown): number => {
  const words = extractLexicalText(state).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

export const computeReadTime: CollectionBeforeChangeHook = ({ data }) => {
  if (data && data.body !== undefined) {
    data.readTime = readTimeMinutes(data.body);
  }
  return data;
};

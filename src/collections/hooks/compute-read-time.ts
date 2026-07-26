import type { CollectionBeforeChangeHook } from 'payload';

interface LexicalNode {
  children?: unknown;
  text?: unknown;
}

export function extractLexicalText(state: unknown): string {
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
    state !== null && typeof state === 'object'
      ? (state as { root?: unknown }).root
      : undefined;
  visit(root);
  return parts.join(' ');
}

export function readTimeMinutes(state: unknown): number {
  const words = extractLexicalText(state).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export const computeReadTime: CollectionBeforeChangeHook = ({ data }) => {
  if (data && data.body !== undefined) {
    data.readTime = readTimeMinutes(data.body);
  }
  return data;
};

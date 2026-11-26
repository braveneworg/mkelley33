/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/** One node of rich text, as far as its words go. */
interface WordNode {
  [key: string]: unknown;
}

const isNode = (value: unknown): value is WordNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const wordsOfNode = ({ children, text }: WordNode): string => {
  if (typeof text === 'string') {
    return text;
  }
  return Array.isArray(children) ? children.filter(isNode).map(wordsOfNode).join('') : '';
};

/**
 * The words of a rich text with everything else taken away, one space
 * between its paragraphs. Empty for a text that was never written and for
 * one the owner emptied — the editor leaves an empty paragraph behind, so
 * the text itself cannot be asked whether it says anything.
 */
export const wordsOfText = (
  text: null | undefined | { root: { children: readonly unknown[] } }
): string =>
  (text?.root.children ?? [])
    .filter(isNode)
    .map(wordsOfNode)
    .filter((words) => words !== '')
    .join(' ');

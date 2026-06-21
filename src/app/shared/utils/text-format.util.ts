/** Supported inline formatting tags for chat messages. */
export type FormatTag = 'b' | 'i' | 'u';

/** Result of toggling a formatting tag on a text selection. */
export interface FormatToggleResult {
  /** The new full text. */
  text: string;
  /** New selection start (caret) after the change. */
  selectionStart: number;
  /** New selection end after the change. */
  selectionEnd: number;
}

/** All supported tags, used to recognise neighbouring formatting tags. */
const ALL_TAGS: FormatTag[] = ['b', 'i', 'u'];

/**
 * Removes empty formatting tag pairs from `text`, e.g. `<b></b>`, `<i> </i>`
 * (whitespace only) and nested empties like `<b><i></i></b>`. Runs repeatedly
 * until nothing changes so that nested wrappers collapse fully. This prevents
 * messages that only contain styling markup (and would render as an empty but
 * styled bubble) from being sent.
 */
export function stripEmptyFormatTags(text: string): string {
  const emptyPair = new RegExp(
    `<(${ALL_TAGS.join('|')})>\\s*</\\1>`,
    'gi'
  );

  let result = text;
  let previous: string;
  do {
    previous = result;
    result = result.replace(emptyPair, '');
  } while (result !== previous);

  return result;
}

/** Matches any formatting tag, opening or closing (e.g. `<b>`, `</i>`). */
const ANY_FORMAT_TAG = new RegExp(`</?(${ALL_TAGS.join('|')})>`, 'gi');

/**
 * Returns whether `text` contains anything other than formatting tags and
 * whitespace. This treats messages that only consist of markup as empty,
 * including unbalanced/unclosed tags like a lone `<b>` (which `stripEmpty
 * FormatTags` would not catch) so they cannot create an empty styled bubble.
 */
export function hasVisibleContent(text: string): boolean {
  return text.replace(ANY_FORMAT_TAG, '').trim().length > 0;
}

/**
 * Toggles an inline formatting tag (`<b>`, `<i>`, `<u>`) around the selection
 * `[start, end)` within `text`.
 *
 * Behaviour:
 * - If the selection is already wrapped by the tag, the tag is removed. This
 *   also works through other formatting tags, so toggling `b` off on the inner
 *   `Test` of `<b><i>Test</i></b>` correctly yields `<i>Test</i>` instead of
 *   nesting another `<b>`.
 * - Otherwise the selection is wrapped in the tag (added innermost). With an
 *   empty selection an empty tag pair is inserted and the caret placed between.
 *
 * The returned selection keeps the (now formatted/unformatted) text selected.
 */
export function toggleFormatTag(
  text: string,
  start: number,
  end: number,
  tag: FormatTag
): FormatToggleResult {
  return removeSurroundingTag(text, start, end, tag) ?? addTag(text, start, end, tag);
}

/**
 * Tries to remove a `tag` that wraps the selection. The opening tag may sit
 * directly before `start` or be separated from it only by other formatting
 * tags (e.g. the `<i>` in `<b><i>|Test|</i></b>`); the matching closing tag is
 * located the same way after `end`. Returns `null` when not wrapped.
 */
function removeSurroundingTag(
  text: string,
  start: number,
  end: number,
  tag: FormatTag
): FormatToggleResult | null {
  const open = `<${tag}>`;
  const close = `</${tag}>`;

  const openStart = findOpenTagBefore(text, start, open);
  if (openStart === -1) return null;
  const closeStart = findCloseTagAfter(text, end, close);
  if (closeStart === -1) return null;

  const newText =
    text.slice(0, openStart) +
    text.slice(openStart + open.length, closeStart) +
    text.slice(closeStart + close.length);

  // The selection shifts left by the removed opening tag.
  const newStart = start - open.length;
  const newEnd = end - open.length;
  return { text: newText, selectionStart: newStart, selectionEnd: newEnd };
}

/**
 * Walks left from `pos` skipping any adjacent formatting tags. If the token
 * immediately left (after skipping siblings) is `open`, returns its index;
 * otherwise -1.
 */
function findOpenTagBefore(text: string, pos: number, open: string): number {
  let i = pos;
  while (i > 0) {
    if (text.slice(i - open.length, i) === open) return i - open.length;
    // Left of the selection only opening tags may wrap it (e.g. `<b><i>`).
    const skipped = skipTagLeft(text, i, false);
    if (skipped === i) return -1;
    i = skipped;
  }
  return -1;
}

/**
 * Walks right from `pos` skipping any adjacent formatting tags. If the token
 * immediately right (after skipping siblings) is `close`, returns its index;
 * otherwise -1.
 */
function findCloseTagAfter(text: string, pos: number, close: string): number {
  let i = pos;
  while (i < text.length) {
    if (text.slice(i, i + close.length) === close) return i;
    // Right of the selection only closing tags may wrap it (e.g. `</i></b>`).
    const skipped = skipTagRight(text, i, true);
    if (skipped === i) return -1;
    i = skipped;
  }
  return -1;
}

/**
 * If a formatting tag ends exactly at `i`, returns the index where it starts;
 * otherwise returns `i`. `closing` selects closing vs opening tags.
 */
function skipTagLeft(text: string, i: number, closing: boolean): number {
  for (const t of ALL_TAGS) {
    const token = closing ? `</${t}>` : `<${t}>`;
    if (i - token.length >= 0 && text.slice(i - token.length, i) === token) {
      return i - token.length;
    }
  }
  return i;
}

/**
 * If a formatting tag starts exactly at `i`, returns the index right after it;
 * otherwise returns `i`. `closing` selects closing vs opening tags.
 */
function skipTagRight(text: string, i: number, closing: boolean): number {
  for (const t of ALL_TAGS) {
    const token = closing ? `</${t}>` : `<${t}>`;
    if (text.slice(i, i + token.length) === token) return i + token.length;
  }
  return i;
}

/** Wraps the selection in the tag (added innermost, directly around it). */
function addTag(
  text: string,
  start: number,
  end: number,
  tag: FormatTag
): FormatToggleResult {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const selected = text.slice(start, end);
  const newText = text.slice(0, start) + open + selected + close + text.slice(end);
  const newStart = start + open.length;
  return { text: newText, selectionStart: newStart, selectionEnd: newStart + selected.length };
}

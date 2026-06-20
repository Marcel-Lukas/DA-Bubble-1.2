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

/**
 * Toggles an inline formatting tag (`<b>`, `<i>`, `<u>`) around the selection
 * `[start, end)` within `text`.
 *
 * Behaviour:
 * - If the selected text is already wrapped by the tag (either the selection
 *   itself contains the surrounding tags, or the tags sit directly outside the
 *   selection), the tags are removed.
 * - Otherwise the selection is wrapped in the tag. With an empty selection an
 *   empty tag pair is inserted and the caret is placed in between.
 *
 * The returned selection keeps the (now formatted/unformatted) text selected.
 */
export function toggleFormatTag(
  text: string,
  start: number,
  end: number,
  tag: FormatTag
): FormatToggleResult {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const selected = text.slice(start, end);

  // Case 1: the selection itself starts/ends with the tag -> strip inner tags.
  if (selected.startsWith(open) && selected.endsWith(close)) {
    const inner = selected.slice(open.length, selected.length - close.length);
    const newText = text.slice(0, start) + inner + text.slice(end);
    return { text: newText, selectionStart: start, selectionEnd: start + inner.length };
  }

  // Case 2: the tags sit directly outside the selection -> strip outer tags.
  const before = text.slice(0, start);
  const after = text.slice(end);
  if (before.endsWith(open) && after.startsWith(close)) {
    const newText =
      before.slice(0, before.length - open.length) +
      selected +
      after.slice(close.length);
    const newStart = start - open.length;
    return { text: newText, selectionStart: newStart, selectionEnd: newStart + selected.length };
  }

  // Case 3: not formatted yet -> wrap the selection.
  const newText = before + open + selected + close + after;
  const newStart = start + open.length;
  return { text: newText, selectionStart: newStart, selectionEnd: newStart + selected.length };
}

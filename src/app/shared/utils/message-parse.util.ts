import { FormatTag } from './text-format.util';

/**
 * A slice of a parsed message used for rendering: either plain text, a mention
 * of a user (`@`) / channel (`#`), or a clickable link.
 */
export interface MessageSegment {
  type: 'text' | 'user' | 'channel' | 'link';
  /** Text to display (e.g. `@Max`, `#general`, a URL or plain text). */
  label: string;
  /** Id of the referenced user/channel, if resolvable. */
  refId?: string;
  /** Absolute URL to open for `link` segments. */
  href?: string;
  /** Whether the segment is bold (`<b>`). */
  bold?: boolean;
  /** Whether the segment is italic (`<i>`). */
  italic?: boolean;
  /** Whether the segment is underlined (`<u>`). */
  underline?: boolean;
}

/** A name that can be mentioned (a user via `@` or a channel via `#`). */
export interface MentionCandidate {
  /** Canonical display name (shown regardless of the typed casing). */
  name: string;
  /** Id of the referenced user/channel. */
  id: string;
}

/** Options controlling how a message text is parsed into segments. */
export interface ParseMessageOptions {
  /** Known users for `@` mention detection. */
  users: MentionCandidate[];
  /** Known channels for `#` mention detection. */
  channels: MentionCandidate[];
  /**
   * When `true`, URLs/e-mails are NOT turned into clickable links (guests'
   * messages stay plain text). Defaults to `false`.
   */
  isGuestSender?: boolean;
}

/** The inline formatting state active while parsing a message. */
interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface FormatTagMatch {
  format: keyof FormatState;
  open: boolean;
  length: number;
}

const FORMAT_TOKENS: { token: string; format: keyof FormatState; open: boolean }[] = [
  { token: '<b>', format: 'bold', open: true },
  { token: '</b>', format: 'bold', open: false },
  { token: '<i>', format: 'italic', open: true },
  { token: '</i>', format: 'italic', open: false },
  { token: '<u>', format: 'underline', open: true },
  { token: '</u>', format: 'underline', open: false },
];

/**
 * Matches `http(s)`/`www.` URLs and e-mail addresses. The URL alternatives
 * come first so that `https://user@host` is not misread as an e-mail address.
 */
const LINK_REGEX =
  /(https?:\/\/[^\s<]+|www\.[^\s<]+|(?:mailto:)?[^\s<@]+@[^\s<@]+\.[^\s<@]+)/gi;

/**
 * Parses a raw message text into renderable {@link MessageSegment}s.
 *
 * Recognises the inline formatting tags `<b>`, `<i>`, `<u>` (toggling state),
 * `@`/`#` mentions of the longest matching known name (supporting multi-word
 * names like `@First Last`) and — unless the sender is a guest — clickable
 * URLs and e-mail addresses.
 *
 * The raw text is never injected as HTML, so only this fixed set of tags has
 * any effect and arbitrary markup stays harmless plain text.
 */
export function parseMessageText(
  text: string,
  options: ParseMessageOptions
): MessageSegment[] {
  const segments: MessageSegment[] = [];
  const format: FormatState = { bold: false, italic: false, underline: false };

  let plainStart = 0;
  let i = 0;

  while (i < text.length) {
    const symbol = text[i];
    const tag = symbol === '<' ? matchFormatTag(text, i) : null;
    const mention =
      symbol === '@' || symbol === '#'
        ? matchMentionAt(text, i, symbol, format, options)
        : null;

    if (tag) {
      pushPlainText(segments, text.slice(plainStart, i), format, options);
      format[tag.format] = tag.open;
      i += tag.length;
      plainStart = i;
    } else if (mention) {
      pushPlainText(segments, text.slice(plainStart, i), format, options);
      segments.push(mention.segment);
      i += mention.length;
      plainStart = i;
    } else {
      i++;
    }
  }

  pushPlainText(segments, text.slice(plainStart), format, options);
  return segments;
}

/** Builds the `href` for a detected link. */
export function buildHref(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('www.')) return `https://${raw}`;
  if (/^mailto:/i.test(raw)) return raw;
  return `mailto:${raw}`;
}

/** Removes trailing punctuation that is usually not part of a URL/e-mail. */
export function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)\]}'"]+$/, '');
}

function pushPlainText(
  segments: MessageSegment[],
  value: string,
  format: FormatState,
  options: ParseMessageOptions
): void {
  if (!value) return;

  // Guests' messages never get clickable links; their URLs and e-mail
  // addresses stay plain text.
  if (options.isGuestSender) {
    segments.push({ type: 'text', label: value, ...formatFlags(format) });
    return;
  }
  pushTextWithLinks(segments, value, format);
}

function pushTextWithLinks(
  segments: MessageSegment[],
  value: string,
  format: FormatState
): void {
  const regex = new RegExp(LINK_REGEX.source, 'gi');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value)) !== null) {
    const raw = trimTrailingPunctuation(match[0]);
    const before = value.slice(lastIndex, match.index);
    if (before) segments.push({ type: 'text', label: before, ...formatFlags(format) });

    segments.push({
      type: 'link',
      // Strip a leading `mailto:` from the visible label for a clean look.
      label: raw.replace(/^mailto:/i, ''),
      href: buildHref(raw),
      ...formatFlags(format),
    });
    lastIndex = match.index + raw.length;
  }

  const tail = value.slice(lastIndex);
  if (tail) segments.push({ type: 'text', label: tail, ...formatFlags(format) });
}

/** Copies the current formatting state onto a fresh segment object. */
function formatFlags(format: FormatState): Partial<MessageSegment> {
  return { bold: format.bold, italic: format.italic, underline: format.underline };
}

/**
 * Detects a supported formatting tag at `pos`. Returns the affected format
 * key, whether it opens or closes and the consumed length, or `null`.
 */
function matchFormatTag(text: string, pos: number): FormatTagMatch | null {
  const lower = text.slice(pos, pos + 4).toLowerCase();
  for (const t of FORMAT_TOKENS) {
    if (lower.startsWith(t.token)) {
      return { format: t.format, open: t.open, length: t.token.length };
    }
  }
  return null;
}

/**
 * Tries to detect the longest matching known name at position `pos` (the
 * `@`/`#`). Returns the segment plus the consumed length, or `null`.
 */
function matchMentionAt(
  text: string,
  pos: number,
  symbol: string,
  format: FormatState,
  options: ParseMessageOptions
): { segment: MessageSegment; length: number } | null {
  const rest = text.slice(pos + 1).toLowerCase();
  const candidates = mentionCandidates(symbol, options);

  for (const c of candidates) {
    if (rest.startsWith(c.lowerName)) {
      return {
        segment: {
          type: symbol === '@' ? 'user' : 'channel',
          // Always show the canonical original name, regardless of how the
          // user typed the mention (e.g. `@peter müller`).
          label: symbol + c.name,
          refId: c.id,
          ...formatFlags(format),
        },
        length: 1 + c.lowerName.length,
      };
    }
  }
  return null;
}

/**
 * Returns the name candidates for the symbol, sorted by length descending so
 * that e.g. `@First Last` is matched before `@First`.
 */
function mentionCandidates(
  symbol: string,
  options: ParseMessageOptions
): { name: string; lowerName: string; id: string }[] {
  const list = symbol === '@' ? options.users : options.channels;

  return list
    .filter((e) => e.name && e.id)
    .map((e) => ({ name: e.name, lowerName: e.name.toLowerCase(), id: e.id }))
    .sort((a, b) => b.lowerName.length - a.lowerName.length);
}

/** Re-exported for callers that still reference the tag type. */
export type { FormatTag };

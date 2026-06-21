import {
  parseMessageText,
  buildHref,
  trimTrailingPunctuation,
  ParseMessageOptions,
  MessageSegment,
} from './message-parse.util';

/** Default empty mention sources (no users/channels known). */
const NO_MENTIONS: ParseMessageOptions = { users: [], channels: [] };

/** Convenience: returns only segment types for structural assertions. */
function types(segments: MessageSegment[]): string[] {
  return segments.map((s) => s.type);
}

describe('message-parse.util', () => {
  describe('buildHref', () => {
    it('keeps http(s) URLs as-is', () => {
      expect(buildHref('https://example.com')).toBe('https://example.com');
      expect(buildHref('http://example.com')).toBe('http://example.com');
    });

    it('prefixes www. links with https://', () => {
      expect(buildHref('www.example.com')).toBe('https://www.example.com');
    });

    it('keeps an existing mailto: prefix (no double prefix)', () => {
      expect(buildHref('mailto:a@b.de')).toBe('mailto:a@b.de');
    });

    it('adds mailto: to a bare e-mail address', () => {
      expect(buildHref('a@b.de')).toBe('mailto:a@b.de');
    });
  });

  describe('trimTrailingPunctuation', () => {
    it('removes a trailing period', () => {
      expect(trimTrailingPunctuation('https://x.de.')).toBe('https://x.de');
    });

    it('removes multiple trailing punctuation chars', () => {
      expect(trimTrailingPunctuation('https://x.de!?)')).toBe('https://x.de');
    });

    it('leaves a clean URL untouched', () => {
      expect(trimTrailingPunctuation('https://x.de/path')).toBe('https://x.de/path');
    });
  });

  describe('parseMessageText - plain text and formatting', () => {
    it('returns a single text segment for plain text', () => {
      const segs = parseMessageText('Hallo Welt', NO_MENTIONS);
      expect(segs.length).toBe(1);
      expect(segs[0]).toEqual(
        jasmine.objectContaining({ type: 'text', label: 'Hallo Welt' })
      );
    });

    it('marks text between <b></b> as bold', () => {
      const segs = parseMessageText('a<b>fett</b>b', NO_MENTIONS);
      const bold = segs.find((s) => s.label === 'fett');
      expect(bold?.bold).toBe(true);
    });

    it('combines nested bold + italic', () => {
      const segs = parseMessageText('<b><i>x</i></b>', NO_MENTIONS);
      const seg = segs.find((s) => s.label === 'x');
      expect(seg?.bold).toBe(true);
      expect(seg?.italic).toBe(true);
    });

    it('treats unknown tags as harmless plain text', () => {
      const segs = parseMessageText('<script>alert(1)</script>', NO_MENTIONS);
      expect(types(segs).every((t) => t === 'text')).toBe(true);
      expect(segs.map((s) => s.label).join('')).toBe('<script>alert(1)</script>');
    });
  });

  describe('parseMessageText - mentions', () => {
    const options: ParseMessageOptions = {
      users: [
        { name: 'Max', id: 'u1' },
        { name: 'Max Mustermann', id: 'u2' },
      ],
      channels: [{ name: 'general', id: 'c1' }],
    };

    it('detects a user mention and resolves the id', () => {
      const segs = parseMessageText('Hi @Max!', options);
      const mention = segs.find((s) => s.type === 'user');
      expect(mention?.label).toBe('@Max');
      expect(mention?.refId).toBe('u1');
    });

    it('prefers the longest matching name (multi-word)', () => {
      const segs = parseMessageText('@Max Mustermann hallo', options);
      const mention = segs.find((s) => s.type === 'user');
      expect(mention?.refId).toBe('u2');
      expect(mention?.label).toBe('@Max Mustermann');
    });

    it('detects a channel mention', () => {
      const segs = parseMessageText('siehe #general', options);
      const mention = segs.find((s) => s.type === 'channel');
      expect(mention?.label).toBe('#general');
      expect(mention?.refId).toBe('c1');
    });

    it('uses the canonical name regardless of typed casing', () => {
      const segs = parseMessageText('@max', options);
      const mention = segs.find((s) => s.type === 'user');
      expect(mention?.label).toBe('@Max');
    });

    it('leaves an unknown mention as plain text', () => {
      const segs = parseMessageText('@Unbekannt', options);
      expect(types(segs)).not.toContain('user');
    });

    it('carries the active formatting onto a mention', () => {
      const segs = parseMessageText('<b>@Max</b>', options);
      const mention = segs.find((s) => s.type === 'user');
      expect(mention?.bold).toBe(true);
    });
  });

  describe('parseMessageText - links (registered users)', () => {
    it('turns an http URL into a link segment', () => {
      const segs = parseMessageText('go https://example.com now', NO_MENTIONS);
      const link = segs.find((s) => s.type === 'link');
      expect(link?.href).toBe('https://example.com');
      expect(link?.label).toBe('https://example.com');
    });

    it('turns a www. link into an https href', () => {
      const segs = parseMessageText('www.example.com', NO_MENTIONS);
      const link = segs.find((s) => s.type === 'link');
      expect(link?.href).toBe('https://www.example.com');
    });

    it('turns an e-mail into a mailto link and hides the prefix in the label', () => {
      const segs = parseMessageText('mail me a@b.de', NO_MENTIONS);
      const link = segs.find((s) => s.type === 'link');
      expect(link?.href).toBe('mailto:a@b.de');
      expect(link?.label).toBe('a@b.de');
    });

    it('strips trailing punctuation from the detected URL', () => {
      const segs = parseMessageText('see https://example.com.', NO_MENTIONS);
      const link = segs.find((s) => s.type === 'link');
      expect(link?.href).toBe('https://example.com');
    });

    it('does not misread https://user@host as an e-mail', () => {
      const segs = parseMessageText('https://user@host.de', NO_MENTIONS);
      const link = segs.find((s) => s.type === 'link');
      expect(link?.href).toBe('https://user@host.de');
    });
  });

  describe('parseMessageText - links (guest senders)', () => {
    it('keeps URLs as plain text for guests', () => {
      const segs = parseMessageText('https://example.com', {
        ...NO_MENTIONS,
        isGuestSender: true,
      });
      expect(types(segs)).not.toContain('link');
      expect(segs[0].label).toBe('https://example.com');
    });

    it('keeps e-mail addresses as plain text for guests', () => {
      const segs = parseMessageText('a@b.de', {
        ...NO_MENTIONS,
        isGuestSender: true,
      });
      expect(types(segs)).not.toContain('link');
    });
  });

  describe('parseMessageText - edge cases', () => {
    it('returns an empty array for empty text', () => {
      expect(parseMessageText('', NO_MENTIONS)).toEqual([]);
    });

    it('ignores candidates without a name or id', () => {
      const segs = parseMessageText('@Ghost', {
        users: [{ name: '', id: 'x' }, { name: 'Ghost', id: '' }],
        channels: [],
      });
      expect(types(segs)).not.toContain('user');
    });
  });
});

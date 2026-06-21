import {
  stripEmptyFormatTags,
  hasVisibleContent,
  toggleFormatTag,
} from './text-format.util';

describe('text-format.util', () => {
  describe('stripEmptyFormatTags', () => {
    it('removes a simple empty tag pair', () => {
      expect(stripEmptyFormatTags('<b></b>')).toBe('');
    });

    it('removes empty pairs containing only whitespace', () => {
      expect(stripEmptyFormatTags('<i>   </i>')).toBe('');
    });

    it('removes nested empty pairs fully', () => {
      expect(stripEmptyFormatTags('<b><i></i></b>')).toBe('');
    });

    it('is case-insensitive for tag names', () => {
      expect(stripEmptyFormatTags('<B></B>')).toBe('');
    });

    it('keeps tags that contain visible content', () => {
      expect(stripEmptyFormatTags('<b>Hi</b>')).toBe('<b>Hi</b>');
    });

    it('removes only the empty pair and keeps surrounding text', () => {
      expect(stripEmptyFormatTags('Hallo <b></b>Welt')).toBe('Hallo Welt');
    });

    it('leaves plain text untouched', () => {
      expect(stripEmptyFormatTags('Kein Tag hier')).toBe('Kein Tag hier');
    });
  });

  describe('hasVisibleContent', () => {
    it('returns false for an empty string', () => {
      expect(hasVisibleContent('')).toBe(false);
    });

    it('returns false for whitespace only', () => {
      expect(hasVisibleContent('    ')).toBe(false);
    });

    it('returns false for a balanced empty tag pair', () => {
      expect(hasVisibleContent('<b></b>')).toBe(false);
    });

    it('returns false for an unbalanced/unclosed tag', () => {
      expect(hasVisibleContent('<b>')).toBe(false);
    });

    it('returns false for only formatting tags and whitespace', () => {
      expect(hasVisibleContent('<b> </b><i></i>')).toBe(false);
    });

    it('returns true when there is text inside tags', () => {
      expect(hasVisibleContent('<b>Hallo</b>')).toBe(true);
    });

    it('returns true for an open tag followed by text', () => {
      expect(hasVisibleContent('<b>Hallo')).toBe(true);
    });

    it('returns true for plain text', () => {
      expect(hasVisibleContent('Test')).toBe(true);
    });
  });

  describe('toggleFormatTag - adding', () => {
    it('wraps a selection in the requested tag', () => {
      const result = toggleFormatTag('Hallo Welt', 0, 5, 'b');
      expect(result.text).toBe('<b>Hallo</b> Welt');
    });

    it('keeps the inner text selected after wrapping', () => {
      const result = toggleFormatTag('Hallo Welt', 0, 5, 'b');
      expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('Hallo');
    });

    it('inserts an empty pair with the caret in the middle for an empty selection', () => {
      const result = toggleFormatTag('', 0, 0, 'i');
      expect(result.text).toBe('<i></i>');
      expect(result.selectionStart).toBe(3);
      expect(result.selectionEnd).toBe(3);
    });

    it('supports the underline tag', () => {
      const result = toggleFormatTag('abc', 0, 3, 'u');
      expect(result.text).toBe('<u>abc</u>');
    });
  });

  describe('toggleFormatTag - removing', () => {
    it('removes the tag when the selection is directly wrapped', () => {
      // Selection is the inner "Test" of "<b>Test</b>".
      const result = toggleFormatTag('<b>Test</b>', 3, 7, 'b');
      expect(result.text).toBe('Test');
    });

    it('keeps the unwrapped text selected after removal', () => {
      const result = toggleFormatTag('<b>Test</b>', 3, 7, 'b');
      expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('Test');
    });

    it('removes the outer tag through a nested formatting tag', () => {
      // Toggle <b> off on the inner "Test" of "<b><i>Test</i></b>".
      const result = toggleFormatTag('<b><i>Test</i></b>', 6, 10, 'b');
      expect(result.text).toBe('<i>Test</i>');
    });

    it('removes the matching tag of a triple-nested middle tag', () => {
      // <b><i><u>Test</u></i></b>, toggle the middle <i> off.
      const result = toggleFormatTag('<b><i><u>Test</u></i></b>', 9, 13, 'i');
      expect(result.text).toBe('<b><u>Test</u></b>');
    });
  });

  describe('toggleFormatTag - round trip', () => {
    it('returns to the original text when toggled twice', () => {
      const original = 'Hallo Welt';
      const added = toggleFormatTag(original, 0, 5, 'b');
      const removed = toggleFormatTag(
        added.text,
        added.selectionStart,
        added.selectionEnd,
        'b'
      );
      expect(removed.text).toBe(original);
    });
  });
});

import { Timestamp } from '@angular/fire/firestore';
import { toMillis } from './time.util';

describe('time.util - toMillis', () => {
  it('converts a Firestore Timestamp', () => {
    const ts = Timestamp.fromMillis(1_700_000_000_000);
    expect(toMillis(ts)).toBe(1_700_000_000_000);
  });

  it('converts a Date', () => {
    const date = new Date(1_700_000_000_000);
    expect(toMillis(date)).toBe(1_700_000_000_000);
  });

  it('returns a plain number unchanged', () => {
    expect(toMillis(1234)).toBe(1234);
  });

  it('converts an object with a toMillis() method', () => {
    const like = { toMillis: () => 9999 };
    expect(toMillis(like)).toBe(9999);
  });

  it('converts an object with a seconds field to milliseconds', () => {
    expect(toMillis({ seconds: 5 })).toBe(5000);
  });

  it('returns null for null', () => {
    expect(toMillis(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(toMillis(undefined)).toBeNull();
  });

  it('prefers toMillis() over a seconds field when both exist', () => {
    const like = { toMillis: () => 1, seconds: 100 };
    expect(toMillis(like)).toBe(1);
  });
});

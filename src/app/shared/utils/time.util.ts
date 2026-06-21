import { Timestamp } from '@angular/fire/firestore';

/** A value that can represent a point in time across Firestore/JS variants. */
export type TimeLike =
  | Timestamp
  | Date
  | number
  | { toMillis: () => number }
  | { seconds: number }
  | null
  | undefined;

/**
 * Normalizes a Firestore `Timestamp` (or any compatible value) into
 * milliseconds since the epoch. Returns `null` when the value cannot be
 * interpreted as a point in time.
 *
 * Centralizes the previously duplicated conversion logic from the
 * authentication and notification services.
 */
export function toMillis(value: TimeLike): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    if (typeof (value as { toMillis?: unknown }).toMillis === 'function') {
      return (value as { toMillis: () => number }).toMillis();
    }
    if (typeof (value as { seconds?: unknown }).seconds === 'number') {
      return (value as { seconds: number }).seconds * 1000;
    }
  }
  return null;
}

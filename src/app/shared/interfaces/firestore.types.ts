import { FieldValue, Timestamp } from '@angular/fire/firestore';

/**
 * Represents a Firestore time field. On read it is a {@link Timestamp} (or a
 * plain {@link Date} for locally created objects); on write it may be a
 * {@link FieldValue} produced by `serverTimestamp()`. Modelling all three
 * variants explicitly avoids the use of `any` while keeping the existing
 * read/write call sites valid.
 */
export type FirestoreTime = Timestamp | Date | FieldValue;

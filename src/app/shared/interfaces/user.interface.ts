import { Timestamp } from '@angular/fire/firestore';

/** Presence-related time field (heartbeat / read marker). */
export type PresenceTime = Timestamp | Date | number | { seconds: number };

/**
 * Shared shape of a user document. Both {@link UserInterface} and {@link User}
 * derive from this to avoid duplicating the field definitions; they only
 * differ in whether the document id (`uId`) is required.
 */
interface UserBase {
  uName: string;
  uEmail: string;
  uUserImage: string;
  uStatus: boolean;
  uLastReactions: string[];
  /** Time of the last heartbeat for presence detection. */
  uLastSeen?: PresenceTime;
  /** Time up to which the user has read all messages. */
  uLastRead?: PresenceTime;
}

/** User document where the id is always present (e.g. when writing). */
export interface UserInterface extends UserBase {
  uId: string;
}

/** User document where the id may be absent (e.g. before persisting). */
export interface User extends UserBase {
  uId?: string;
}



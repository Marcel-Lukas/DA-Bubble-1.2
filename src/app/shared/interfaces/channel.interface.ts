import { FirestoreTime } from './firestore.types';

/** Firestore `channels` document. `c*` fields map 1:1 to the stored shape. */
export interface Channel {
  cId?: string | null;
  cName: string;
  cDescription: string | null;
  /** UID of the user who created the channel (owner; used for permission checks). */
  cCreatedByUser: string;
  /** UIDs of all channel members. */
  cUserIds: string[];
  cTime: FirestoreTime;
}
import { Reaction } from './reaction.interface';
import { FirestoreTime } from './firestore.types';

/** Firestore `messages` document. A message belongs to either a channel or a thread. */
export interface Message {
  mId?: string | null;
  mText: string;
  mReactions?: Reaction[];
  mTime: FirestoreTime;
  /** UID of the author. */
  mSenderId: string | null;
  mUserId?: string | null;
  /** Set for thread replies; references the parent message id. */
  mThreadId?: string | null;
  /** Set for channel messages; references the owning channel. */
  mChannelId?: string | null;
}
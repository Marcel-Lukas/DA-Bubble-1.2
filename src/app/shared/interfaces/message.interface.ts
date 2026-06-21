import { Reaction } from './reaction.interface';
import { FirestoreTime } from './firestore.types';

export interface Message {
  mId?: string | null;
  mText: string;
  mReactions?: Reaction[];
  mTime: FirestoreTime;
  mSenderId: string | null;
  mUserId?: string | null;
  mThreadId?: string | null;
  mChannelId?: string | null;
}
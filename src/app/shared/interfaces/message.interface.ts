import { Timestamp } from '@angular/fire/firestore';
import { Reaction } from './reaction.interface';

export interface Message {
  mId?: string | null;
  mText: string;
  mReactions?: Reaction[];
  mTime: Timestamp | any;
  mSenderId: string | null;
  mUserId?: string | null;
  mThreadId?: string | null;
  mChannelId?: string | null;
}
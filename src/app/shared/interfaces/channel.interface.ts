import { FirestoreTime } from './firestore.types';

export interface Channel {
  cId?: string | null;
  cName: string;
  cDescription: string | null;
  cCreatedByUser: string;
  cUserIds: string[];
  cTime: FirestoreTime;
}
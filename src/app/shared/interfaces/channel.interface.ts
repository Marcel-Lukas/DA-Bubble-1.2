import { Timestamp } from '@angular/fire/firestore';

export interface Channel {
    cId?: string | null;
    cName: string;
    cDescription: string | null; 
    cCreatedByUser: string; 
    cUserIds: string[];
    cTime: Timestamp | any;
}
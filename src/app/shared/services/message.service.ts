import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  where,
  orderBy,
  query,
  onSnapshot,
  Query,
  DocumentData,
  QuerySnapshot,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Message } from '../interfaces/message.interface';
import {
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { Reaction } from '../interfaces/reaction.interface';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private firestore = inject(Firestore);

  setNoteObject(obj: any, id: string): Message {
    return {
      mId: id || '',
      mText: obj.mText || '',
      mReactions: obj.mReactions || [],
      mTime: obj.mTime || new Date(),
      mSenderId: obj.mSenderId || '',
      mUserId: obj.mUserId || '',
      mThreadId: obj.mThreadId || '',
      mChannelId: obj.mChannelId || '',
    };
  }

  getMessages(
    chatType: 'private' | 'channel' | 'thread' | 'new',
    chatId: string | null,
    activeUserId: string | null
  ): Observable<Message[]> {
    switch (chatType) {
      case 'private':
        return this.getPrivateMessages(chatId, activeUserId);
      case 'channel':
        return this.getChannelMessages(chatId);
      case 'thread':
        return this.getThreadMessages(chatId);
      default:
        return new Observable<Message[]>((observer) => {
          observer.next([]);
        });
    }
  }

  private getPrivateMessages(
    chatId: string | null,
    activeUserId: string | null
  ): Observable<Message[]> {
    return new Observable<Message[]>((observer) => {
      const [q1, q2] = this.createPrivateMessageQueries(chatId, activeUserId);
      let arr1: Message[] = [];
      let arr2: Message[] = [];

      const unsub1 = onSnapshot(q1, (snap) => {
        arr1 = this.mapDocsToMessages(snap);
        observer.next(this.mergeAndSort(arr1, arr2));
      });
      const unsub2 = onSnapshot(q2, (snap) => {
        arr2 = this.mapDocsToMessages(snap);
        observer.next(this.mergeAndSort(arr1, arr2));
      });

      return () => {
        unsub1();
        unsub2();
      };
    });
  }

  private createPrivateMessageQueries(
    chatId: string | null,
    activeUserId: string | null
  ): [Query<DocumentData>, Query<DocumentData>] {
    const col = collection(this.firestore, 'messages');

    const q1 = query(
      col,
      where('mUserId', '==', activeUserId),
      where('mSenderId', '==', chatId),
      orderBy('mTime', 'asc')
    );
    const q2 = query(
      col,
      where('mUserId', '==', chatId),
      where('mSenderId', '==', activeUserId),
      orderBy('mTime', 'asc')
    );
    return [q1, q2];
  }

  private mapDocsToMessages(snapshot: QuerySnapshot<DocumentData>): Message[] {
    return snapshot.docs.map((doc) => this.setNoteObject(doc.data(), doc.id));
  }

  private mergeAndSort(arr1: Message[], arr2: Message[]): Message[] {
    const merged = [...arr1];
    arr2.forEach((msg) => {
      if (!merged.find((m) => m.mId === msg.mId)) {
        merged.push(msg);
      }
    });
    merged.sort((a, b) => this.getTimeValue(a) - this.getTimeValue(b));
    return merged;
  }

  private getTimeValue(msg: Message): number {
    if (msg.mTime instanceof Timestamp) {
      return msg.mTime.toDate().getTime();
    } else if (msg.mTime instanceof Date) {
      return msg.mTime.getTime();
    }
    return 0;
  }

  private getChannelMessages(chatId: string | null): Observable<Message[]> {
    return new Observable<Message[]>((observer) => {
      const messagesCollection = collection(this.firestore, 'messages');

      const q = query(
        messagesCollection,
        where('mChannelId', '==', chatId),
        orderBy('mTime', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
          messages.push(this.setNoteObject(doc.data(), doc.id));
        });
        observer.next(messages);
      });

      return () => unsubscribe && unsubscribe();
    });
  }

  getThreadMessages(chatId: string | null): Observable<Message[]> {
    return new Observable<Message[]>((observer) => {
      const messagesCollection = collection(this.firestore, 'messages');
      const q = query(
        messagesCollection,
        where('mThreadId', '==', chatId),
        orderBy('mTime', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
          messages.push(this.setNoteObject(doc.data(), doc.id));
        });
        observer.next(messages);
      });
      return () => unsubscribe && unsubscribe();
    });
  }

  createMessage(message: Partial<Message>): Promise<any> {
    const messagesCollection = collection(this.firestore, 'messages');
    const newMessage = {
      ...message,
      mTime: serverTimestamp(),
    };
    return addDoc(messagesCollection, newMessage);
  }

  editMessageText(messageId: string, newText: string): Promise<void> {
    if (!messageId) {
      return Promise.reject(new Error('Message ID fehlt.'));
    }

    const messageRef = doc(this.firestore, 'messages', messageId);
    return updateDoc(messageRef, {
      mText: newText,
    });
  }

  deleteMessage(messageId: string): Promise<void> {
    if (!messageId) {
      return Promise.reject(new Error('Message ID fehlt.'));
    }

    const messageRef = doc(this.firestore, 'messages', messageId);
    return deleteDoc(messageRef);
  }

  async deleteMessagesBySender(senderId: string): Promise<void> {
    if (!senderId) {
      return;
    }
    const colRef = collection(this.firestore, 'messages');
    const q = query(colRef, where('mSenderId', '==', senderId));
    const snap = await getDocs(q);

    if (snap.empty) {
      return;
    }
    let batch = writeBatch(this.firestore);
    let inBatch = 0;
    let batchIndex = 1;
    let processed = 0;
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      inBatch++;
      processed++;

      if (inBatch === 500) {
        batch.commit();
        batch = writeBatch(this.firestore);
        inBatch = 0;
        batchIndex++;
      }
    });

    if (inBatch > 0) {
      await batch.commit();
    }
  }

  async toggleReaction(messageId: string, reaction: Reaction): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', messageId);

    const docSnap = await getDoc(messageRef);
    if (!docSnap.exists()) {
      throw new Error('Message not found');
    }

    const messageData = docSnap.data() as Message;
    const newReactions = [...(messageData.mReactions || [])];

    const index = newReactions.findIndex(
      (r) => r.userId === reaction.userId && r.reaction === reaction.reaction
    );

    if (index > -1) {
      newReactions.splice(index, 1);
    } else {
      newReactions.push(reaction);
    }

    await updateDoc(messageRef, { mReactions: newReactions });
  }

  async startThread(parentMessageId: string): Promise<void> {
    const parentRef = doc(this.firestore, 'messages', parentMessageId);
    await updateDoc(parentRef, { mThreadId: parentMessageId });
  }

  async replyInThread(
    threadId: string,
    text: string,
    senderId: string
  ): Promise<void> {
    const messagesCollection = collection(this.firestore, 'messages');
    const newMsg: Partial<Message> = {
      mText: text,
      mSenderId: senderId,
      mReactions: [],
      mThreadId: threadId,
    };
    await addDoc(messagesCollection, {
      ...newMsg,
      mTime: serverTimestamp(),
    });
  }

  getAllMessages(): Promise<Message[]> {
    const messagesCollection = collection(this.firestore, 'messages');
    return getDocs(messagesCollection).then((snap) =>
      snap.docs.map((doc) => doc.data() as Message)
    );
  }

  async getMessageById(id: string): Promise<Message | undefined> {
    const docRef = doc(this.firestore, 'messages', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()
      ? { mId: docSnap.id, ...(docSnap.data() as Message) }
      : undefined;
  }
}

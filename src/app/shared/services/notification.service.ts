import {
  Injectable,
  inject,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Verwaltet die Benachrichtigungen für neue Nachrichten:
 * - spielt einen Sound ab, wenn eine neue Nachricht eintrifft
 * - merkt sich pro Chat (Channel-ID bzw. User-ID), ob ungelesene Nachrichten
 *   vorliegen, damit die Contact-Bar eine blinkende Markierung anzeigen kann.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  /** ID des aktuell geöffneten Chats (Channel-ID oder Gesprächspartner-UID). */
  private activeChatId: string | null = null;
  /** UID des aktuell eingeloggten Nutzers. */
  private activeUserId: string | null = null;
  /** Channel-IDs in denen der Nutzer Mitglied ist (für relevante Benachrichtigungen). */
  private memberChannelIds = new Set<string>();

  /** Zeitpunkt ab dem Nachrichten als "neu" gelten (App-/Login-Start). */
  private startTime = Timestamp.now();

  /** Set aller Chats (Channel-ID / User-ID) mit ungelesenen Nachrichten. */
  private unreadSubject = new BehaviorSubject<Set<string>>(new Set());
  /** Observable mit den IDs aller Chats, die ungelesene Nachrichten haben. */
  readonly unread$: Observable<Set<string>> = this.unreadSubject.asObservable();

  private unsubMessages?: () => void;
  private unsubChannels?: () => void;
  private audio?: HTMLAudioElement;

  /** Audio-Element vorbereiten (Lazy, damit es nur im Browser passiert). */
  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio('assets/sounds/new-message-sound.wav');
      this.audio.preload = 'auto';
    }
    return this.audio;
  }

  /**
   * Startet die Echtzeit-Überwachung neuer Nachrichten für den aktiven Nutzer.
   * Sollte einmalig nach dem Login (z. B. in der MainContent-Komponente) mit
   * der eigenen UID aufgerufen werden.
   */
  start(activeUserId: string | null): void {
    if (!activeUserId) return;
    this.activeUserId = activeUserId;
    this.startTime = Timestamp.now();
    this.listenForChannels();
    this.listenForMessages();
  }

  /** Beendet die Überwachung und setzt den Zustand zurück. */
  stop(): void {
    this.unsubMessages?.();
    this.unsubMessages = undefined;
    this.unsubChannels?.();
    this.unsubChannels = undefined;
    this.memberChannelIds.clear();
    this.unreadSubject.next(new Set());
  }

  /**
   * Teilt dem Service mit, welcher Chat gerade geöffnet ist. Für diesen Chat
   * wird kein Sound abgespielt und die ungelesen-Markierung wird entfernt.
   */
  setActiveChat(
    chatType: 'private' | 'channel' | 'thread' | 'new',
    chatId: string | null
  ): void {
    this.activeChatId = chatType === 'new' ? null : chatId;
    if (this.activeChatId) {
      this.markAsRead(this.activeChatId);
    }
  }

  /** Entfernt die ungelesen-Markierung eines Chats. */
  markAsRead(chatId: string): void {
    const current = this.unreadSubject.value;
    if (current.has(chatId)) {
      const updated = new Set(current);
      updated.delete(chatId);
      this.unreadSubject.next(updated);
    }
  }

  /**
   * Hält die Liste der Channels aktuell, in denen der Nutzer Mitglied ist.
   * Nur für diese Channels werden Benachrichtigungen ausgelöst.
   */
  private listenForChannels(): void {
    this.unsubChannels?.();
    this.unsubChannels = runInInjectionContext(this.injector, () => {
      const col = collection(this.firestore, 'channels');
      const q = query(
        col,
        where('cUserIds', 'array-contains', this.activeUserId)
      );
      return onSnapshot(q, (snap) => {
        this.memberChannelIds = new Set(snap.docs.map((d) => d.id));
      });
    });
  }

  /**
   * Lauscht auf alle neuen Nachrichten, die nach dem Start erstellt wurden und
   * an den aktiven Nutzer gerichtet sind (DM an mich oder Channel-Nachricht).
   */
  private listenForMessages(): void {
    this.unsubMessages?.();
    this.unsubMessages = runInInjectionContext(this.injector, () => {
      const col = collection(this.firestore, 'messages');
      const q = query(
        col,
        where('mTime', '>', this.startTime),
        orderBy('mTime', 'asc')
      );
      return onSnapshot(q, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            this.handleNewMessage(change.doc.data());
          }
        });
      });
    });
  }

  /** Verarbeitet eine einzelne neu eingetroffene Nachricht. */
  private handleNewMessage(data: any): void {
    const senderId: string | null = data?.mSenderId ?? null;
    // Eigene Nachrichten lösen keine Benachrichtigung aus.
    if (!senderId || senderId === this.activeUserId) return;

    const chatId = this.resolveChatId(data);
    if (!chatId) return;

    // Aktiver Chat -> kein Sound, kein Blinken.
    if (chatId === this.activeChatId) return;

    this.addUnread(chatId);
    this.playSound();
  }

  /**
   * Ermittelt die ID des Chats (für die Markierung in der Contact-Bar).
   * - DM an mich -> ID des Absenders (so heißt der Chat in der DM-Liste)
   * - Channel-Nachricht -> Channel-ID
   */
  private resolveChatId(data: any): string | null {
    if (data?.mThreadId) return null; // Thread-Antworten ignorieren
    if (data?.mChannelId) {
      // Nur Channels berücksichtigen, in denen der Nutzer Mitglied ist.
      return this.memberChannelIds.has(data.mChannelId)
        ? (data.mChannelId as string)
        : null;
    }
    if (data?.mUserId === this.activeUserId) {
      return (data?.mSenderId as string) ?? null;
    }
    return null;
  }

  private addUnread(chatId: string): void {
    const current = this.unreadSubject.value;
    if (!current.has(chatId)) {
      const updated = new Set(current);
      updated.add(chatId);
      this.unreadSubject.next(updated);
    }
  }

  /** Spielt den Benachrichtigungssound ab (Fehler werden ignoriert). */
  private playSound(): void {
    try {
      const audio = this.getAudio();
      audio.currentTime = 0;
      audio.play().catch(() => {
        /* Autoplay evtl. vom Browser blockiert – ignorieren */
      });
    } catch {
      /* Audio nicht verfügbar – ignorieren */
    }
  }
}

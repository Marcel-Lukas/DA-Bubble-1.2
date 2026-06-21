import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter, Injector, inject, runInInjectionContext, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Firestore, collectionData, collection, query } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { User } from '../../../../shared/interfaces/user.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-direct-message',
  standalone: true,
  imports: [CommonModule, ImageFallbackDirective],
  templateUrl: './direct-message.component.html',
  styleUrl: './direct-message.component.scss',
})

/** Sidebar list of users for direct messaging, with online + unread state. */
export class DirectMessageComponent implements OnInit {
  showMessages = false;
  activeUser?: User;
  activeUsers$!: Observable<User[]>;
  inactiveUsers$!: Observable<User[]>;
  /** UIDs of chat partners with unread messages (for the blinking indicator). */
  unreadChats = new Set<string>();
  /** Timestamp (ms) at which a user was first observed as online, keyed by uId.
   *  Used to put users who just came online at the very top of the list. */
  private onlineSince = new Map<string, number>();
  @Input() activeUserId!: string | null;
  @Output() openChat = new EventEmitter<{ chatType: 'private' | 'channel'; chatId: string }>();
  @Output() toggleMessage = new EventEmitter<boolean>();

  private notificationService = inject(NotificationService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);

  constructor(private firestore: Firestore) {}

  someAction(): void {
    const screenWidth = window.innerWidth;

    if (screenWidth < 1000) {
      this.toggleMessage.emit(true);
    }
  }

  ngOnInit(): void {
    if (this.activeUserId) {
      this.loadUsers();
    }
    this.notificationService.unread$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((set) => {
        this.unreadChats = set;
      });
  }

  loadUsers(): void {
    const users$ = runInInjectionContext(this.injector, () => {
      const usersCollection = collection(this.firestore, 'users');
      const usersQuery = query(usersCollection);
      return collectionData(usersQuery, { idField: 'uId' }) as Observable<User[]>;
    });
    // Hide orphaned/offline guest accounts (empty email). An active guest stays
    // visible to everyone so they can be messaged. The own account is always
    // visible.
    const visibleUsers$ = users$.pipe(
      map(users => users.filter(user => this.isVisibleUser(user)))
    );
    this.activeUsers$ = visibleUsers$.pipe(
      map(users => users.filter(user => user.uId === this.activeUserId))
    );
    this.inactiveUsers$ = visibleUsers$.pipe(
      map(users => users.filter(user => user.uId !== this.activeUserId)),
      map(users => this.sortByOnlineStatus(users))
    );
    visibleUsers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(users => {
        this.activeUser = users.find(user => user.uId === this.activeUserId);
      });
  }


  /**
   * Sorts the user list so that online users appear at the top, while offline
   * users are listed afterwards. Among online users, those who came online most
   * recently are shown first (newly online users move to the very top).
   */
  private sortByOnlineStatus(users: User[]): User[] {
    const now = Date.now();
    for (const user of users) {
      const uid = user.uId;
      if (!uid) continue;
      if (this.isOnline(user)) {
        if (!this.onlineSince.has(uid)) {
          this.onlineSince.set(uid, now);
        }
      } else {
        this.onlineSince.delete(uid);
      }
    }
    return [...users].sort((a, b) => {
      const aOnline = this.isOnline(a);
      const bOnline = this.isOnline(b);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      if (aOnline && bOnline) {
        // Both online: most recently online first.
        return (this.onlineSince.get(b.uId ?? '') ?? 0) - (this.onlineSince.get(a.uId ?? '') ?? 0);
      }
      // Both offline: keep a stable alphabetical order.
      return (a.uName ?? '').localeCompare(b.uName ?? '');
    });
  }

  /**
   * Decides whether a user is shown in the direct-message list.
   * - Ghost/partial documents without a name (e.g. only presence fields) are
   *   always hidden.
   * - The own account is always visible.
   * - Registered users (with an email) are always visible.
   * - Guests (empty/missing email) are only visible while online, so orphaned
   *   guest documents do not appear but an active guest can be messaged.
   */
  private isVisibleUser(user: User): boolean {
    // Never show ghost documents (no name) – not even the own one.
    if (!user.uName || user.uName.trim() === '') return false;
    if (user.uId === this.activeUserId) return true;
    // Full (registered) users have a non-empty email.
    if (user.uEmail && user.uEmail !== '') return true;
    // Remaining: guests (empty/missing email) – only when online.
    return this.isOnline(user);
  }

  /**
   * Determines the online status from the last sign of life (uLastSeen). A user
   * counts as online when their last heartbeat is younger than the presence
   * threshold – so a tab closed without logout is detected as offline shortly
   * afterwards.
   */
  isOnline(user: User): boolean {
    return NotificationService.isUserOnline(user);
  }

  showAllMessages() {
    this.showMessages = !this.showMessages;
  }

  
  selectPrivateChat(userId: string) {
    this.notificationService.markAsRead(userId);
    this.openChat.emit({
      chatType: 'private',
      chatId: userId,
    });
  }
}

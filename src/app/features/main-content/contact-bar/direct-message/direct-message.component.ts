import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, Injector, inject, runInInjectionContext } from '@angular/core';
import { Firestore, collectionData, collection, query } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { User } from '../../../../shared/interfaces/user.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-direct-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './direct-message.component.html',
  styleUrl: './direct-message.component.scss',
})

export class DirectMessageComponent implements OnInit, OnDestroy {
  showMessages = false;
  activeUser?: User;
  activeUsers$!: Observable<any[]>;
  inactiveUsers$!: Observable<any[]>;
  /** UIDs der Gesprächspartner mit ungelesenen Nachrichten (blinkende Markierung). */
  unreadChats = new Set<string>();
  @Input() activeUserId!: string | null;
  @Output() openChat = new EventEmitter<{ chatType: 'private' | 'channel'; chatId: string }>();
  @Output() toggleMessage = new EventEmitter<boolean>();

  private notificationService = inject(NotificationService);
  private unreadSub?: Subscription;

  someAction() {
    const screenWidth = window.innerWidth;
    
    if (screenWidth < 1000) {
      this.toggleMessage.emit(true);
    }
  }
  
  private injector = inject(Injector);

  constructor(private firestore: Firestore, private route: ActivatedRoute) {}


  ngOnInit(): void {
    if (this.activeUserId) {
      this.loadUsers();
    }
    this.unreadSub = this.notificationService.unread$.subscribe((set) => {
      this.unreadChats = set;
    });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }



  loadUsers(): void {
    const users$ = runInInjectionContext(this.injector, () => {
      const usersCollection = collection(this.firestore, 'users');
      const usersQuery = query(usersCollection);
      return collectionData(usersQuery, { idField: 'uId' }).pipe(
        map((users: any[]) => users.map(user => user as User))
      );
    });
    // Fremde Gast-Konten (leere E-Mail) ausblenden – nur der eigene Gast bleibt sichtbar.
    const visibleUsers$ = users$.pipe(
      map(users => users.filter(user => user.uEmail !== '' || user.uId === this.activeUserId))
    );
    this.activeUsers$ = visibleUsers$.pipe(
      map(users => users.filter(user => user.uId === this.activeUserId))
    );
    this.inactiveUsers$ = visibleUsers$.pipe(
      map(users => users.filter(user => user.uId !== this.activeUserId))
    );
    visibleUsers$.subscribe(users => {
      this.activeUser = users.find(user => user.uId === this.activeUserId);
    });
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

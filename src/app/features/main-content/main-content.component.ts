
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { ContactBarComponent } from './contact-bar/contact-bar.component';
import { MessageAreaComponent } from './message-area/message-area.component';
import { SearchBarComponent } from './header/search-bar/search-bar.component';
import { DeviceVisibleComponent } from '../../shared/services/responsive';
import { AuthentificationService } from '../../shared/services/authentification.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [
    HeaderComponent,
    ContactBarComponent,
    MessageAreaComponent,
    SearchBarComponent,
    DeviceVisibleComponent
],
  templateUrl: './main-content.component.html',
  styleUrls: ['./main-content.component.scss'],
})
export class MainContentComponent {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthentificationService);
  private notificationService = inject(NotificationService);

  smallSize = false;
  messageIn = false;
  sectionVisible = true;

  activeUserId: string | null = null;

  chatType: 'private' | 'channel' | 'thread' | 'new' = 'private';
  chatId: string | null = null;

  threadId: string | null = null;
  isThreadOpen = false;

  ngOnInit(): void {
    this.activeUserId = this.route.snapshot.paramMap.get('activeUserId');
    this.chatId = this.activeUserId;
    this.chatType = 'private';

    if (this.authService.currentUid === null) this.authService.currentUid = this.activeUserId;

    this.notificationService.start(this.activeUserId);
    this.notificationService.setActiveChat(this.chatType, this.chatId);

    this.updateScreenSize();
    window.addEventListener('resize', () => this.updateScreenSize());
  }

  ngOnDestroy(): void {
    this.notificationService.stop();
  }

  toggleSection() {
    this.sectionVisible = !this.sectionVisible;
  }

  handleMessageInToggle(state: boolean) {
    this.messageIn = state;
  }

  handleOpenChat(event: {
    chatType: 'private' | 'channel' | 'new';
    chatId: string | null;
  }) {
    this.chatType = event.chatType;
    this.chatId = event.chatId;
    this.isThreadOpen = false;
    this.threadId = '';
    this.notificationService.setActiveChat(this.chatType, this.chatId);
  }

  handleOpenThread(event: {
    chatType: 'channel' | 'private';
    chatId: string;
    threadId: string;
  }) {
    this.chatType = event.chatType;
    this.chatId = event.chatId;
    this.isThreadOpen = true;
    this.threadId = event.threadId;
    this.notificationService.setActiveChat(this.chatType, this.chatId);
  }

  handleChannelDeleted() {
    // Der aktuell geöffnete Channel wurde gelöscht -> Chat für alle schließen
    // und auf den eigenen "leeren" Zustand zurücksetzen.
    this.isThreadOpen = false;
    this.threadId = '';
    this.chatType = 'private';
    this.chatId = this.activeUserId;
    this.notificationService.setActiveChat(this.chatType, this.chatId);
  }

  handleChatPartnerDeleted() {
    // Der Gesprächspartner (z.B. ein Gast) existiert nicht mehr -> offenen
    // Privat-Chat schließen und auf den eigenen Zustand zurücksetzen.
    this.isThreadOpen = false;
    this.threadId = '';
    this.chatType = 'private';
    this.chatId = this.activeUserId;
    this.notificationService.setActiveChat(this.chatType, this.chatId);
  }

  openThread(threadId: string) {
    this.isThreadOpen = true;
    this.threadId = threadId;
  }

  closeThread() {
    this.isThreadOpen = false;
    this.threadId = null;
  }

  private updateScreenSize() {
    this.smallSize = window.innerWidth < 1000;
  }
}

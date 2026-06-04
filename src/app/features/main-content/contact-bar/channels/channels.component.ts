import { CommonModule } from '@angular/common';
import { AddChannelComponent } from './add-channel/add-channel.component';
import { Component, Input, EventEmitter, Output, inject, OnDestroy } from '@angular/core';
import { Observable, of, Subscription } from 'rxjs';
import { ChannelService } from '../../../../shared/services/channel.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PermanentDeleteComponent } from '../../../general-components/permanent-delete/permanent-delete.component';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [CommonModule, AddChannelComponent, PermanentDeleteComponent],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss'
})

export class ChannelsComponent implements OnDestroy {
  showAddChannel = false;
  showChannels = false;
  isPermanentDeleteOpen = false;
  openChannelId: string | null = null;
  channels$: Observable<any[]> = of([]); 
  /** IDs der Channels mit ungelesenen Nachrichten (für die blinkende Markierung). */
  unreadChannels = new Set<string>();
  @Input() activeUserId!: any;
  @Output() openChat = new EventEmitter<{ chatType: 'private' | 'channel'; chatId: string }>();
  @Output() toggleMessage = new EventEmitter<boolean>();

  private notificationService = inject(NotificationService);
  private unreadSub?: Subscription;

  constructor(private channelService: ChannelService) {}

  ngOnInit() {
    this.loadChannels();
    this.unreadSub = this.notificationService.unread$.subscribe((set) => {
      this.unreadChannels = set;
    });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  someAction() {
    const screenWidth = window.innerWidth;
    if (screenWidth < 1000) {
      this.toggleMessage.emit(true);
    }
  }
  
  
  loadChannels() {
    this.channels$ = this.channelService.getSortedChannels(this.activeUserId);
  }
  
  
  toggleAddChannel() {
    this.showAddChannel = !this.showAddChannel;
  }


  showAllChannels(){
    this.showChannels = !this.showChannels
  }


  selectChannel(channelId: string, type: 'channel' | 'private' = 'channel'): void {
    if (type === 'channel') {
      this.notificationService.markAsRead(channelId);
    }
    this.openChat.emit({
      chatType: `${type}`,
      chatId: channelId
    });
  }


  onDeleteClick(channelId: string, event: MouseEvent) {
    event.stopPropagation();
    this.openChannelId = channelId;
    this.isPermanentDeleteOpen = true;
    this.selectChannel(this.activeUserId, 'private');
  }
}


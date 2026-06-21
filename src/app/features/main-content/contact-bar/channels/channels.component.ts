import { CommonModule } from '@angular/common';
import { AddChannelComponent } from './add-channel/add-channel.component';
import { Component, Input, EventEmitter, Output, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { ChannelService, ChannelListItem } from '../../../../shared/services/channel.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PermanentDeleteComponent } from '../../../general-components/permanent-delete/permanent-delete.component';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [CommonModule, AddChannelComponent, PermanentDeleteComponent],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss'
})

/** Sidebar list of the channels the user belongs to, with unread indicators. */
export class ChannelsComponent implements OnInit {
  showAddChannel = false;
  showChannels = false;
  isPermanentDeleteOpen = false;
  openChannelId: string | null = null;
  channels$: Observable<ChannelListItem[]> = of([]);
  /** IDs of channels with unread messages (for the blinking indicator). */
  unreadChannels = new Set<string>();
  @Input() activeUserId: string | null = null;
  @Output() openChat = new EventEmitter<{ chatType: 'private' | 'channel'; chatId: string }>();
  @Output() toggleMessage = new EventEmitter<boolean>();

  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  constructor(private channelService: ChannelService) {}

  ngOnInit(): void {
    this.loadChannels();
    this.notificationService.unread$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((set) => {
        this.unreadChannels = set;
      });
  }

  // On small screens, switch the layout to the message view after a selection.
  someAction(): void {
    const screenWidth = window.innerWidth;
    if (screenWidth < 1000) {
      this.toggleMessage.emit(true);
    }
  }

  loadChannels(): void {
    this.channels$ = this.channelService.getSortedChannels(this.activeUserId);
  }

  toggleAddChannel(): void {
    this.showAddChannel = !this.showAddChannel;
  }

  showAllChannels(): void {
    this.showChannels = !this.showChannels;
  }

  selectChannel(channelId: string, type: 'channel' | 'private' = 'channel'): void {
    if (type === 'channel') {
      this.notificationService.markAsRead(channelId);
    }
    this.openChat.emit({
      chatType: type,
      chatId: channelId
    });
  }


  /**
   * Opens the delete confirmation for a channel. Stops propagation so the row
   * click does not also open the channel, and switches the open chat back to
   * the user's own private view (the channel may be gone after confirming).
   */
  onDeleteClick(channelId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openChannelId = channelId;
    this.isPermanentDeleteOpen = true;
    if (this.activeUserId) {
      this.selectChannel(this.activeUserId, 'private');
    }
  }
}


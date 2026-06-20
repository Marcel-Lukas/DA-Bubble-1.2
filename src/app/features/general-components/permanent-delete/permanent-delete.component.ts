import { Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { MessageService } from '../../../shared/services/message.service';
import { ChannelService } from '../../../shared/services/channel.service';

type DeleteTarget = 'message' | 'channel' | 'user' | 'member';

@Component({
  selector: 'app-permanent-delete',
  imports: [],
  templateUrl: './permanent-delete.component.html',
  styleUrl: './permanent-delete.component.scss',
})
/**
 * Generic confirm-and-delete dialog for a message, channel or account. The
 * `target` selects which service call runs on confirmation; channel deletion
 * is owner-checked via `requestingUserId`.
 */
export class PermanentDeleteComponent {
  private messageService = inject(MessageService);
  private channelService = inject(ChannelService);

  @Input({ required: true }) target!: DeleteTarget;
  @Input({ required: true }) id!: any;
  /** Id of the currently logged-in user – required for the owner check when deleting a channel. */
  @Input() requestingUserId: string | null = null;
  /** Optional override for the dialog heading (e.g. to include a member's name). */
  @Input() headingText: string | null = null;

  @Output() close = new EventEmitter<void>();
  /** Emitted when the user confirms a `'user'` or `'member'` target. */
  @Output() confirm = new EventEmitter<void>();

  onNo(): void {
    this.close.emit();
  }

  /** Runs the delete operation matching the configured target, then closes. */
  onYes(): void {
    switch (this.target) {
      case 'message':
        this.messageService
          .deleteMessage(this.id)
          .then(() => this.close.emit())
          .catch((err) =>
            console.error('Error while deleting the message', err)
          );
        break;

      case 'channel':
        this.channelService
          .deleteChannel(this.id, this.requestingUserId)
          .then(() => this.close.emit())
          .catch((err) => {
            console.error('Error while deleting the channel', err);
            this.close.emit();
          });
        break;
      case 'user':
      case 'member':
        this.confirm.emit();
        break;

      default:
        console.warn('Unknown delete target:', this.target);
        this.close.emit();
    }
  }
  get heading(): string {
    if (this.headingText) {
      return this.headingText;
    }
    switch (this.target) {
      case 'message':
        return 'Nachricht permanent löschen?';
      case 'channel':
        return 'Channel permanent löschen?';
      case 'user':
        return 'Account permanent löschen?';
      case 'member':
        return 'Mitglied wirklich entfernen?';
      default:
        return 'Permanent löschen?';
    }
  }
}


import { Component, EventEmitter, Output } from '@angular/core';
import { DeviceVisibleComponent } from '../../../../shared/components/device-visible/device-visible.component';

@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [DeviceVisibleComponent],
  templateUrl: './header-bar.component.html',
  styleUrl: './header-bar.component.scss'
})
export class HeaderBarComponent {
  @Output() openChat = new EventEmitter<{
    chatType: 'private' | 'channel' | 'new';
    chatId: string | null;
  }>();
  @Output() toggleMessage = new EventEmitter<boolean>();

  openNewChat() {
      this.openChat.emit({
        chatType: 'new',
        chatId: null,
      });
  }

  someAction() {
    const screenWidth = window.innerWidth;
    if (screenWidth < 1000) {
      this.toggleMessage.emit(true);
    }
  }

}

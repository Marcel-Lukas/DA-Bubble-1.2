
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { UserNameComponent } from './user-name/user-name.component';
import { DeviceVisibleComponent } from '../../../shared/services/responsive';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    SearchBarComponent,
    UserNameComponent,
    DeviceVisibleComponent
],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Input() activeUserId!: string | null;
  @Input() messageIn!: boolean;

  @Output() messageInToggle = new EventEmitter<boolean>();
  @Output() openChat = new EventEmitter<{
    chatType: 'private' | 'channel' | 'new';
    chatId: string;
  }>();
  @Output() openThread = new EventEmitter<{
    chatType: 'channel' | 'private';
    chatId: string;
    threadId: string;
  }>();
  toggleMessageInView() {
    this.messageInToggle.emit(false);
  }

}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { User } from '../../../shared/interfaces/user.interface';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-list.component.html',
  styleUrl: './member-list.component.scss'
})

export class MemberListComponent {
  @Input() channelMembers: User[] = [];
  @Input() activeUserId!: string | null;

  @Output() addMember = new EventEmitter<void>();
  @Output() showProfil = new EventEmitter<User>();  
}

import { Component } from '@angular/core';
import { ComponentSwitcherService } from '../../../shared/services/component-switcher.service';

@Component({
  selector: 'app-privacy',
  imports: [],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent {
  constructor(public componentSwitcher: ComponentSwitcherService) {}

  goBack(): void {
    this.componentSwitcher.setComponent('login');
  }
}

import { Component } from '@angular/core';
import { ComponentSwitcherService } from '../../../shared/services/component-switcher.service';

@Component({
  selector: 'app-imprint',
  imports: [],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss'
})
export class ImprintComponent {
  constructor(public componentSwitcher: ComponentSwitcherService) {}

  goBack(): void {
    this.componentSwitcher.setComponent('login');
  }
}

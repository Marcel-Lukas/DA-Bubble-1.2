import { Component, inject, OnInit } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ComponentSwitcherService } from '../../shared/services/component-switcher.service';
import { ActivatedRoute } from '@angular/router';
import { LogoComponent } from './logo/logo.component';
import { LoginComponent } from './login/login.component';
import { ImprintComponent } from './imprint/imprint.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { ButtonComponent } from '../general-components/button/button.component';
import { VisibleButtonService } from '../../shared/services/visible-button.service';

@Component({
  selector: 'app-access',
  imports: [NgComponentOutlet, LogoComponent, ButtonComponent],
  templateUrl: './access.component.html',
  styleUrl: './access.component.scss'
})
export class AccessComponent implements OnInit {
  private visibleBtn = inject(VisibleButtonService);

  showAnimation: boolean = false;
  LoginComponent = LoginComponent;
  ImprintComponent = ImprintComponent;
  PrivacyComponent = PrivacyComponent;

  readonly isButtonVisible = this.visibleBtn.visibleButton;

  constructor(private route: ActivatedRoute, public componentSwitcher: ComponentSwitcherService) {}

  ngOnInit(): void {
    this.handleResetMode();
    this.isAnimation();
  }

  isAnimation() {
    const animationShown = localStorage.getItem('showAnimation');
    if (animationShown === 'true') {
      this.showAnimation = true;
    }
  }

  handleResetMode() {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'resetPassword') {
      this.changeComponent('conPassword');
    }
  }

  changeComponent(componentName: string) {
    this.componentSwitcher.setComponent(componentName);
  }
}

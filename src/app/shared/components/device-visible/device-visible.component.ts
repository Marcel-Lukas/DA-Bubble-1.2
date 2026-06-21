import { Component, HostListener, Input, OnInit } from '@angular/core';

/** Viewport modes the {@link DeviceVisibleComponent} can react to. */
export type DeviceVisibleMode = 'mobilBig' | 'tabletBig' | 'desktopBig';

/**
 * Conditionally renders its projected content based on the viewport width.
 * The breakpoint to compare against is chosen via the `mode` input, allowing
 * mobile/tablet/desktop-specific markup without manual resize handling.
 */
@Component({
  selector: 'app-device-visible',
  template: `@if (shouldShow) {
    <ng-content></ng-content>
  }`,
})
export class DeviceVisibleComponent implements OnInit {
  @Input() mode: DeviceVisibleMode = 'desktopBig';
  shouldShow = false;

  ngOnInit(): void {
    this.checkWidth();
  }

  /** Re-evaluates visibility against the current window width on each resize. */
  @HostListener('window:resize')
  checkWidth(): void {
    const width = window.innerWidth;

    switch (this.mode) {
      case 'mobilBig':
        this.shouldShow = width < 600;
        break;
      case 'tabletBig':
        this.shouldShow = width < 1000;
        break;
      case 'desktopBig':
        this.shouldShow = width > 1000;
        break;
    }
  }
}

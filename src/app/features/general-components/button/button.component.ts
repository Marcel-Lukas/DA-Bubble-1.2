import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';

type ButtonColor = 'blue' | 'white' | 'gray' | 'transparent' | 'sky-grey';

@Component({
  selector: 'app-button',
  imports: [],
  template: `
    <button
      class="font-nuninto"
      [class]="getButtonClasses()"
      [type]="type"
      [disabled]="disabled"
      (click)="handleClick()"
    >
      <ng-content></ng-content>
    </button>
  `,
  styleUrls: ['./button.component.scss'],
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() color: ButtonColor = 'blue';

  @Output() clicked = new EventEmitter<void>();

  @HostBinding('class.full-width-host') 
  get isFullWidth(): boolean {
    return this.color === 'gray';
  }

  getButtonClasses(): string {
    const baseClass = `btn btn-${this.color}`;
    return baseClass;
  }

  handleClick(): void {
    this.clicked.emit();
  }
}

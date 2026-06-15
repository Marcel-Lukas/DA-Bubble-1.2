import {
  Component,
  Input,
  forwardRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-custom-input',
  imports: [ReactiveFormsModule],
  template: `
    <label>
      <ng-content select="[icon]"></ng-content>
      <input
        #inputElement
        [type]="currentType"
        [name]="name"
        [placeholder]="placeholder"
        [autocomplete]="autocomplete"
        [value]="value"
        (input)="onInputChange($event)"
        (blur)="onBlur()"
      />
      @if (type === 'password') {
        <button
          type="button"
          class="toggle-password"
          [attr.aria-label]="isPasswordVisible ? 'Passwort verbergen' : 'Passwort anzeigen'"
          [attr.aria-pressed]="isPasswordVisible"
          (click)="togglePasswordVisibility()"
        >
          @if (isPasswordVisible) {
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 16C13.25 16 14.3127 15.5627 15.188 14.688C16.0627 13.8127 16.5 12.75 16.5 11.5C16.5 10.25 16.0627 9.18733 15.188 8.312C14.3127 7.43733 13.25 7 12 7C10.75 7 9.68733 7.43733 8.812 8.312C7.93733 9.18733 7.5 10.25 7.5 11.5C7.5 12.75 7.93733 13.8127 8.812 14.688C9.68733 15.5627 10.75 16 12 16ZM12 14.2C11.25 14.2 10.6123 13.9373 10.087 13.412C9.56233 12.8873 9.3 12.25 9.3 11.5C9.3 10.75 9.56233 10.1123 10.087 9.587C10.6123 9.06233 11.25 8.8 12 8.8C12.75 8.8 13.3877 9.06233 13.913 9.587C14.4377 10.1123 14.7 10.75 14.7 11.5C14.7 12.25 14.4377 12.8873 13.913 13.412C13.3877 13.9373 12.75 14.2 12 14.2ZM12 19C9.56667 19 7.35 18.3207 5.35 16.962C3.35 15.604 1.9 13.7833 1 11.5C1.9 9.21667 3.35 7.39567 5.35 6.037C7.35 4.679 9.56667 4 12 4C14.4333 4 16.65 4.679 18.65 6.037C20.65 7.39567 22.1 9.21667 23 11.5C22.1 13.7833 20.65 15.604 18.65 16.962C16.65 18.3207 14.4333 19 12 19Z"
                style="fill: var(--icon-color)"
              />
            </svg>
          } @else {
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.1 13.3L14.65 11.85C14.8 11.0667 14.575 10.3333 13.975 9.65C13.375 8.96667 12.6167 8.7 11.7 8.85L10.25 7.4C10.5333 7.26667 10.8127 7.16667 11.088 7.1C11.3627 7.03333 11.6667 7 12 7C13.25 7 14.3127 7.43733 15.188 8.312C16.0627 9.18733 16.5 10.25 16.5 11.5C16.5 11.8333 16.4667 12.1373 16.4 12.412C16.3333 12.6873 16.2333 12.9667 16.1 13.25V13.3ZM19.3 16.45L17.85 15.05C18.4833 14.5667 19.046 14.0373 19.538 13.462C20.0293 12.8873 20.45 12.2333 20.8 11.5C19.9667 9.81667 18.7707 8.479 17.212 7.487C15.654 6.49567 13.9167 6 12 6C11.5167 6 11.0417 6.03333 10.575 6.1C10.1083 6.16667 9.65 6.26667 9.2 6.4L7.65 4.85C8.33333 4.56667 9.03333 4.354 9.75 4.212C10.4667 4.07067 11.2167 4 12 4C14.5167 4 16.7583 4.69567 18.725 6.087C20.6917 7.479 22.1167 9.28333 23 11.5C22.6167 12.4833 22.1127 13.396 21.488 14.238C20.8627 15.0793 20.1333 15.8167 19.3 16.45ZM19.8 22.6L15.6 18.45C15.0167 18.6333 14.4293 18.7707 13.838 18.862C13.246 18.954 12.6333 19 12 19C9.48333 19 7.24167 18.3043 5.275 16.913C3.30833 15.521 1.88333 13.7167 1 11.5C1.35 10.6167 1.79167 9.796 2.325 9.038C2.85833 8.27933 3.46667 7.6 4.15 7L1.4 4.2L2.8 2.8L21.2 21.2L19.8 22.6ZM5.55 8.4C5.06667 8.83333 4.62067 9.30833 4.212 9.825C3.804 10.3417 3.46667 10.9 3.2 11.5C4.03333 13.1833 5.229 14.521 6.787 15.513C8.34567 16.5043 10.0833 17 12 17C12.3333 17 12.6583 16.9793 12.975 16.938C13.2917 16.896 13.6167 16.85 13.95 16.8L13.05 15.85C12.8667 15.9 12.6917 15.9373 12.525 15.962C12.3583 15.9873 12.1833 16 12 16C10.75 16 9.68733 15.5627 8.812 14.688C7.93733 13.8127 7.5 12.75 7.5 11.5C7.5 11.3167 7.51233 11.1417 7.537 10.975C7.56233 10.8083 7.6 10.6333 7.65 10.45L5.55 8.4Z"
                style="fill: var(--icon-color)"
              />
            </svg>
          }
        </button>
      }
    </label>
  `,
  styleUrls: ['./custom-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true,
    },
  ],
})
/**
 * Styled text input that integrates with Angular forms via
 * ControlValueAccessor, so it can be used with formControlName/ngModel.
 */
export class CustomInputComponent implements ControlValueAccessor {
  @Input() type: string = 'text';
  @Input() name: string = '';
  @Input() placeholder: string = '';
  @Input() autocomplete: string = 'on';

  @ViewChild('inputElement') inputElement!: ElementRef;

  value: string = '';
  onChange: any = () => {};
  onTouch: any = () => {};
  disabled: boolean = false;
  isPasswordVisible: boolean = false;

  /** Effective input type, taking the password visibility toggle into account. */
  get currentType(): string {
    if (this.type === 'password' && this.isPasswordVisible) {
      return 'text';
    }
    return this.type;
  }

  /** Toggles whether the password value is shown as plain text. */
  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  onInputChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
  }

  onBlur() {
    this.onTouch();
  }

  writeValue(value: string): void {
    this.value = value || '';
    if (this.inputElement) {
      this.inputElement.nativeElement.value = this.value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.inputElement) {
      this.inputElement.nativeElement.disabled = isDisabled;
    }
  }
}

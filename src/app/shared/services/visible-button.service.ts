import { Injectable, signal } from '@angular/core';

/** Shared signal controlling the visibility of a global UI button. */
@Injectable({
  providedIn: 'root'
})
export class VisibleButtonService {
  private readonly visibleButtonSignal = signal(true);
  readonly visibleButton = this.visibleButtonSignal.asReadonly();

  show(): void {
    this.visibleButtonSignal.set(true);
  }

  hide(): void {
    this.visibleButtonSignal.set(false);
  }
}

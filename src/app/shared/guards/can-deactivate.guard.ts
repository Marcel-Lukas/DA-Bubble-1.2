import { CanDeactivateFn } from '@angular/router';

/**
 * Contract for components that want to guard against accidental in-app
 * navigation away from their current view (e.g. via the browser back button).
 *
 * A component implementing this interface decides itself whether it is safe to
 * leave. Returning `false` (or a Promise resolving to `false`) cancels the
 * navigation and keeps the user on the current view.
 */
export interface CanComponentDeactivate {
  /**
   * @returns `true` if the user may leave the current view, otherwise `false`.
   *          May be returned synchronously or as a Promise (e.g. to show a
   *          confirmation dialog and await the user's decision).
   */
  canDeactivate: () => boolean | Promise<boolean>;
}

/**
 * Functional `CanDeactivate` guard for navigation INSIDE the Angular app.
 *
 * It simply delegates the decision to the component instance, which keeps the
 * guard generic and reusable across any view that implements
 * {@link CanComponentDeactivate}. Components that do not implement the
 * interface are always allowed to deactivate.
 */
export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component
): boolean | Promise<boolean> => {
  return component.canDeactivate ? component.canDeactivate() : true;
};

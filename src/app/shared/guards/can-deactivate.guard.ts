import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AuthentificationService } from '../services/authentification.service';

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
 * It delegates the decision to the component instance, which keeps the guard
 * generic and reusable across any view that implements
 * {@link CanComponentDeactivate}. Components that do not implement the
 * interface are always allowed to deactivate.
 *
 * A deliberate logout (which navigates to `/access`) must never trigger the
 * confirmation, so we skip the check while `AuthentificationService.isLoggingOut`
 * is set.
 */
export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component
): boolean | Promise<boolean> => {
  const authService = inject(AuthentificationService);
  if (authService.isLoggingOut) return true;

  return component.canDeactivate ? component.canDeactivate() : true;
};

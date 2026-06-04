import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard } from './shared/guards/auth.guard';

/**
 * Top-level routes.
 *
 * - `loadComponent` is used so that the authentication screen and the main
 *   chat shell are split into separate JS chunks. The login page no longer
 *   needs to ship the entire chat UI, which dramatically reduces the
 *   initial bundle.
 * - `authGuard` blocks unauthenticated access to `/home` and friends.
 * - `publicOnlyGuard` redirects already signed-in users away from `/access`.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'access', pathMatch: 'full' },

  {
    path: 'access',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./features/access/access.component').then(
        (m) => m.AccessComponent
      ),
  },

  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/main-content/main-content.component').then(
        (m) => m.MainContentComponent
      ),
  },
  {
    path: 'home/:activeUserId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/main-content/main-content.component').then(
        (m) => m.MainContentComponent
      ),
  },

  { path: '**', redirectTo: 'access' },
];

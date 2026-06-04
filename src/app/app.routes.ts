import { Routes } from '@angular/router';
import { AccessComponent } from './features/access/access.component';
import { MainContentComponent } from './features/main-content/main-content.component';

export const routes: Routes = [
  { path: '', redirectTo: 'access', pathMatch: 'full' },
  { path: 'access', component: AccessComponent },

  { path: 'home', component: MainContentComponent },
  { path: 'home/:activeUserId', component: MainContentComponent },

  { path: '**', redirectTo: 'access' }
];

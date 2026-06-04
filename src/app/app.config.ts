import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() =>
      initializeApp({
        apiKey: 'AIzaSyAUuW1tu7kER7S3OjAnx6MzbtMOgprHyAA',
        authDomain: 'da-bubbel-marcel.firebaseapp.com',
        projectId: 'da-bubbel-marcel',
        storageBucket: 'da-bubbel-marcel.firebasestorage.app',
        messagingSenderId: '930772520005',
        appId: '1:930772520005:web:fa0bf0a7603fdd27ce272c',
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideAnimations(),
  ],
};

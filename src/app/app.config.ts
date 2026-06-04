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
        apiKey: "AIzaSyBiSFslova_2HnFlFFk_yJR3o_qLy0l6jE",
        authDomain: "da-bubble-e9933.firebaseapp.com",
        projectId: "da-bubble-e9933",
        storageBucket: "da-bubble-e9933.firebasestorage.app",
        messagingSenderId: "454168748045",
        appId: "1:454168748045:web:aaa9fbd93a0e8655063544"
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideAnimations(),
  ],
};

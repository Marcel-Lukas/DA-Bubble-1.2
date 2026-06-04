/**
 * Template for `environment.ts` / `environment.prod.ts`.
 *
 * Setup:
 *   cp src/environments/environment.example.ts src/environments/environment.ts
 *   cp src/environments/environment.example.ts src/environments/environment.prod.ts
 *
 * Fill in the Firebase web-app credentials from the Firebase Console:
 *   Project Settings → General → Your apps → Web app → SDK setup.
 *
 * NOTE: Even though Firebase web API keys are not "secret", we keep them out
 * of source control and rely on Firestore Security Rules + Firebase App Check
 * to lock the project down. See README for details.
 */
export const environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.firebasestorage.app',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};

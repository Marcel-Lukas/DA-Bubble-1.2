import { User as AuthUser } from '@angular/fire/auth';

/**
 * Alias for the Firebase Authentication user, kept separate from the
 * application's own `User` interface to avoid a naming collision.
 */
export type FirebaseUser = AuthUser;

import { inject, Injectable } from '@angular/core';
import { UserInterface } from '../interfaces/user.interface';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import {
  Auth,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  UserCredential,
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthentificationService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);

  public currentUid: string | null = null;
  public registrationData: {
    email: string;
    password: string;
    username: string;
  } | null = null;

  constructor() {}

  async prepareRegistration(email: string, password: string, username: string): Promise<void | UserCredential> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('uEmail', '==', email));
    return getDocs(q).then((querySnapshot) => {
      if (!querySnapshot.empty) return Promise.reject('User with this email is found');
      this.registrationData = {
        email,
        password,
        username
      };
      return Promise.resolve();
    });
  }

  async completeRegistration(profilePictureUrl: string): Promise<UserCredential> {
    if (!this.registrationData) {
      return Promise.reject('No active registration available');
    }
  
    const { email, password, username } = this.registrationData;
  
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    const uid = userCredential.user.uid;
  
    const userData: UserInterface = {
      uId:            uid,
      uName:          username,
      uEmail:         email,
      uUserImage:     'assets/img/' + profilePictureUrl,
      uStatus:        false,
      uLastReactions: ['👍', '😊'],
    };
  
    const userRef    = collection(this.firestore, 'users');
    const userDocRef = doc(userRef, uid);
    await setDoc(userDocRef, userData);
  
    const defaultChannelId = '4ViNXTttFDYKlytrxQw4';
    const channelRef       = doc(this.firestore, 'channels', defaultChannelId);
    await updateDoc(channelRef, {
      cUserIds: arrayUnion(uid),
    });
  
    this.registrationData = null;
    return userCredential;
  }

  async loginWithEmail(email: string, password: string): Promise<void | UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password)
    .then(async (result) => {
      this.currentUid = result.user.uid;
      const userRef = collection(this.firestore, 'users');
      const userDocRef = doc(userRef, this.currentUid);
      await updateDoc(userDocRef, { uStatus: true });
      return result;
    });
  }

  async loginWithGoogle(): Promise<void | UserCredential> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider)
    .then(async (result) => {
      this.currentUid = result.user.uid;
      const userData: UserInterface = {
        uId: this.currentUid,
        uName: result.user.displayName || '',
        uEmail: result.user.email || '',
        uUserImage: result.user.photoURL || 'assets/img/profile.png',
        uStatus: true,
        uLastReactions: ['👍', '😊']
      };
      const userRef = collection(this.firestore, 'users');
      const userDocRef = doc(userRef, result.user.uid);
      await setDoc(userDocRef, userData, { merge: true });
      const defaultChannelId = '4ViNXTttFDYKlytrxQw4';
      const channelRef = doc(this.firestore, 'channels', defaultChannelId);
      await updateDoc(channelRef, { cUserIds: arrayUnion(this.currentUid) });
      return result;
    });
  }

  async loginAsGuest(): Promise<void | UserCredential> {
    return signInAnonymously(this.auth)
    .then(async (result) => {
      this.currentUid = result.user.uid;
      const guestData: UserInterface = {
        uId: this.currentUid,
        uName: 'Gast',
        uEmail: '',
        uUserImage: 'assets/img/profile.png',
        uStatus: true,
        uLastReactions: ['👍', '😊']
      };
      const userRef = collection(this.firestore, 'users');
      const userDocRef = doc(userRef, this.currentUid);
      await setDoc(userDocRef, guestData, { merge: true });
      const defaultChannelId = '4ViNXTttFDYKlytrxQw4';
      const channelRef = doc(this.firestore, 'channels', defaultChannelId);
      await updateDoc(channelRef, { cUserIds: arrayUnion(this.currentUid) });
      return result;
    });
  }

  async sendResetPasswordEmail(email: string): Promise<void> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('uEmail', '==', email));
    return getDocs(q).then((querySnapshot) => {
      if (querySnapshot.empty) return Promise.reject('No user with this email found');
      return sendPasswordResetEmail(this.auth, email);
    });
  }

  async confirmResetPassword(oobCode: string, newPassword: string): Promise<void> {
    return confirmPasswordReset(this.auth, oobCode, newPassword);
  }

  async logout(): Promise<void> {
    const uid = this.currentUid;
    const user = this.auth.currentUser;
    
    await this.handleAnonymousGuest(user, uid);
    await this.updateUserStatus(uid);
    await this.signOutUser();
  }

  private async handleAnonymousGuest(user: any | null, uid: string | null): Promise<void> {
    if (user?.isAnonymous && uid) {
      const userDocRef = doc(collection(this.firestore, 'users'), uid);
      try {
        await deleteDoc(userDocRef);
        await user.delete();
      } catch (deleteErr) {
        console.warn('Gast-Löschen fehlgeschlagen, weiter mit Sign-Out', deleteErr);
      }
    }
  }

  private async updateUserStatus(uid: string | null): Promise<void> {
    if (!uid) return;

    const userDoc = doc(collection(this.firestore, 'users'), uid);
    try {
      await updateDoc(userDoc, { uStatus: false });
    } catch (err) {
      console.warn('Status-Update fehlgeschlagen (Dokument evtl. gelöscht)', err);
    }
  }

  private async signOutUser(): Promise<void> {
    await this.auth.signOut();
    this.currentUid = null;
  }
}

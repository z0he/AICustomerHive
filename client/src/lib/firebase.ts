import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Get Firebase authentication instance
export const auth = getAuth(app);

// Create Google auth provider
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider (optional settings)
googleProvider.setCustomParameters({
  prompt: 'select_account', // Force account selection even if already logged in
});

// Sign in with Google Popup
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return {
      user: result.user,
      credential: GoogleAuthProvider.credentialFromResult(result),
    };
  } catch (error) {
    console.error("Google sign in error:", error);
    throw error;
  }
};

// Sign in with Google Redirect (alternative method)
export const signInWithGoogleRedirect = () => {
  return signInWithRedirect(auth, googleProvider);
};

// Handle redirect result
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return {
        user: result.user,
        credential: GoogleAuthProvider.credentialFromResult(result),
      };
    }
    return null;
  } catch (error) {
    console.error("Google redirect error:", error);
    throw error;
  }
};

export default auth;
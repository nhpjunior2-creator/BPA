import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore (support optional databaseId if present in config)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

function createGoogleProvider(options?: { prompt?: string; loginHint?: string }): GoogleAuthProvider {
  const googleProvider = new GoogleAuthProvider();
  DRIVE_SCOPES.forEach((scope) => googleProvider.addScope(scope));
  const customParams: Record<string, string> = {};
  if (options?.prompt) {
    customParams.prompt = options.prompt;
  }
  if (options?.loginHint) {
    customParams.login_hint = options.loginHint;
  }
  if (Object.keys(customParams).length > 0) {
    googleProvider.setCustomParameters(customParams);
  }
  return googleProvider;
}

export const provider = createGoogleProvider({ prompt: 'select_account' });

// In-memory access token cache (CRITICAL: Do NOT store in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Test connection on boot according to skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using local cache.');
    }
    return false;
  }
}

// Run connection test non-blocking
testFirestoreConnection().catch(() => {});

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup (works for any Google account)
export const googleSignIn = async (
  forceConsent = false
): Promise<{ user: User; accessToken: string | null }> => {
  try {
    isSigningIn = true;
    const activeProvider = createGoogleProvider({
      prompt: forceConsent ? 'consent select_account' : 'select_account',
    });
    const result = await signInWithPopup(auth, activeProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (error: unknown) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Re-acquire Google Drive OAuth access token for an already signed-in Firebase user
export const refreshDriveAccessToken = async (
  forceConsent = false
): Promise<{ user: User; accessToken: string | null }> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return googleSignIn(forceConsent);
  }

  try {
    isSigningIn = true;
    const reconnectProvider = createGoogleProvider({
      prompt: forceConsent ? 'consent' : 'select_account',
      loginHint: currentUser.email || undefined,
    });
    const result = await reauthenticateWithPopup(currentUser, reconnectProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (error: unknown) {
    // Fallback to standard popup sign-in if reauthenticateWithPopup fails (e.g. account mismatch)
    console.warn('Reauthenticate failed, falling back to signInWithPopup:', error);
    const fallbackProvider = createGoogleProvider({
      prompt: forceConsent ? 'consent select_account' : 'select_account',
    });
    const result = await signInWithPopup(auth, fallbackProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const clearCachedAccessToken = () => {
  cachedAccessToken = null;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

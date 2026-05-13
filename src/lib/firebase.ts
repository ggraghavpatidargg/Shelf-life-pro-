import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use experimentalForceLongPolling to bypass potential gRPC/WebSocket issues in the container environment
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Test connection as per guidelines
async function testConnection() {
  try {
    // We try to fetch a doc. It might return "permission-denied" which is fine, 
    // it means we REACHED the server.
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test: Success (or permission denied as expected)");
  } catch (error) {
    const err = error as any;
    if (err.code === 'permission-denied') {
      console.log("Firestore connection test: Reachable (Permission Denied as expected)");
    } else if (err.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is reporting as offline.");
    } else {
      console.error("Firestore connectivity check failed:", error);
    }
  }
}
testConnection();

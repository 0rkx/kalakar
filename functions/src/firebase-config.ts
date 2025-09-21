import * as admin from 'firebase-admin';

// Firebase Admin configuration
const initializeFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    // Check if we're running in Firebase Functions environment
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development') {
      // Use default credentials in emulator
      admin.initializeApp();
    } else if (process.env.FIREBASE_PRIVATE_KEY) {
      // Use service account credentials from environment variables
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      });
    } else {
      // Use default credentials (for deployed functions)
      admin.initializeApp();
    }
  }

  return admin;
};

// Initialize Firebase services
const firebaseAdmin = initializeFirebaseAdmin();
const db = firebaseAdmin.firestore();
const storage = firebaseAdmin.storage();
const auth = firebaseAdmin.auth();

// Firestore collections
export const collections = {
  users: 'users',
  conversations: 'conversations',
  listings: 'listings',
  exports: 'exports',
} as const;

// Storage buckets
export const storagePaths = {
  audio: (userId: string, filename: string) => `audio/${userId}/${filename}`,
  images: (userId: string, filename: string) => `images/${userId}/${filename}`,
  products: (userId: string, filename: string) => `products/${userId}/${filename}`,
  temp: (userId: string, filename: string) => `temp/${userId}/${filename}`,
} as const;

export { firebaseAdmin, db, storage, auth };
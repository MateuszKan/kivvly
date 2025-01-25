import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    // Use service account credentials or other secure config here
    // You can store these values as environment variables:
    // GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_PROJECT_ID, etc.
    credential: admin.credential.applicationDefault(),
  });
}

// Export the Admin Auth interface
export const adminAuth = admin.auth();

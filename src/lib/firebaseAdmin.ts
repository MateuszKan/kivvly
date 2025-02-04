// lib/firebaseAdmin.ts

import admin from "firebase-admin";

// Check if Firebase Admin is already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace double \n with single newline characters
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    // Optionally, add databaseURL if using Realtime Database
    // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com"
  });
}

// Export Firestore and Auth instances
const db = admin.firestore();
const adminAuth = admin.auth();

export { admin, db, adminAuth };

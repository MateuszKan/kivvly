// src/app/scripts/assignAdmin.js

const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the project root .env file
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.local'), // Adjust the path based on your directory structure
});

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    // Uncomment and set if using Realtime Database
     databaseURL: "kivvly.firebasestorage.app"
  });
}

const db = admin.firestore();

/**
 * Assigns the admin role to a user by setting `isAdmin` to true in their Firestore document.
 * @param {string} uid - The UID of the user to assign the admin role to.
 */
async function assignAdminRole(uid) {
  if (!uid) {
    console.error('Error: No UID provided.');
    process.exit(1);
  }

  try {
    const userRef = db.collection('users').doc(uid);

    await userRef.set(
      { isAdmin: true },
      { merge: true } // Merge to avoid overwriting existing data
    );

    console.log(`Successfully assigned admin role to user: ${uid}`);
  } catch (error) {
    console.error('Error assigning admin role:', error);
    process.exit(1);
  }
}

// Retrieve UID from command-line arguments
const userUid = process.argv[2];

// Validate UID input
if (!userUid) {
  console.error('Usage: node assignAdmin.js <USER_UID>');
  process.exit(1);
}

// Execute the function
assignAdminRole(userUid)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

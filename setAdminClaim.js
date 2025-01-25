const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Your service account JSON file

// Initialize the Admin SDK using the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
   databaseURL: "https://kivvly.firebaseapp.com"
});

// The UID of the user for whom you want to set the isAdmin claim
const uid = "n8IBUhrEIlb4S95pALdRb14Y9s23";

admin
  .auth()
  .setCustomUserClaims(uid, { isAdmin: true })
  .then(() => {
    console.log(`isAdmin: true has been assigned to user with UID: ${uid}`);
    process.exit(0); // Exit the script successfully
  })
  .catch((error) => {
    console.error("Error assigning custom claims:", error);
    process.exit(1); // Exit the script with an error
  });

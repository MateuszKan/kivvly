import { adminAuth } from "../../src/lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST requests allowed" });
  }

  // Check for the Authorization header
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header." });
  }

  const idToken = authHeader.split("Bearer ")[1].trim();
  let decodedToken;
  try {
    // Verify the token
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  // At this point, the token is valid
  // You can access token claims and user info:
  const userId = decodedToken.uid;

  // Parse the request body
  const { locationName, postcode, amenities } = req.body;
  if (!locationName || !postcode) {
    return res.status(400).json({ message: "Location name and postcode are required." });
  }

  try {
    // Example: Insert data into Firestore, etc.
    // Or some other backend logic:
    // const docRef = await db.collection("places").add({
    //   locationName,
    //   postcode,
    //   amenities,
    //   userId,
    //   submittedAt: new Date(),
    // });

    // For simplicity:
    res.status(200).json({ message: "Place added successfully!", userId });
  } catch (error) {
    console.error("Failed to add place:", error);
    res.status(500).json({ message: "Failed to add place.", error });
  }
}

// src/lib/firestore.js
import { db } from "./firebase"; // Ensure this path points to your firebase.js file
import { collection, addDoc } from "firebase/firestore";

export async function addPlace(place) {
  try {
    const docRef = await addDoc(collection(db, "places"), place);
    console.log("Document written with ID: ", docRef.id);
    return docRef;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw new Error("Failed to add place");
  }
}

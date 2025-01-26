import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const storage = getStorage();

/**
 * Uploads a place image for a user (and compressing it if needed).
 * @param userId The user's UID
 * @param file The (optionally resized) file
 */
export async function uploadPlaceImage(userId: string, file: File): Promise<string> {
  const imageRef = ref(storage, `places/${userId}/${uuidv4()}.jpg`);
  const snapshot = await uploadBytesResumable(imageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

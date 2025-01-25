// lib/upload.ts
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const storage = getStorage();

/**
 * Uploads a single avatar image for a user.
 * @returns The download URL of the uploaded image.
 */
export async function uploadAvatarImage(
  userId: string,
  file: File
): Promise<string> {
  const avatarRef = ref(storage, `avatars/${userId}/${uuidv4()}.jpg`);
  const snapshot = await uploadBytesResumable(avatarRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

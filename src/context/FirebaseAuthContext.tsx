"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

// Extend the UserProfile interface to include isVerified
interface UserProfile {
  uid: string;
  displayName?: string;
  avatarUrl?: string;
  jobOccupation?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  /**
   * isVerified can be "yes" | "no" or possibly undefined if your doc
   * doesn’t set it yet. Adjust to your preference.
   */
  isVerified?: "yes" | "no";
}

interface AuthContextType {
  user: FirebaseUser | null;      // The Firebase Auth user object
  profile: UserProfile | null;    // Firestore user doc (including isVerified)
  loading: boolean;               // Are we still fetching data?
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (currentUser) {
        try {
          // 1. Reload to ensure we have the latest emailVerified status
          await currentUser.reload();
          // After reloading, currentUser.emailVerified is up to date

          // 2. Fetch or create user doc
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as Omit<UserProfile, "uid">;

            // 3. If the user's doc says isVerified="no" but
            //    currentUser.emailVerified is true, update to "yes"
            if (data.isVerified === "no" && currentUser.emailVerified) {
              await updateDoc(userDocRef, { isVerified: "yes" });
              data.isVerified = "yes"; // update in local data
            }

            // Merge doc data with the uid
            const mergedProfile: UserProfile = {
              uid: currentUser.uid,
              ...data,
            };
            setProfile(mergedProfile);
          } else {
            // If the doc doesn't exist, set profile = null or create one
            setProfile(null);
          }
        } catch (err) {
          console.error("Error fetching/updating user doc:", err);
          setProfile(null);
        }

        setUser(currentUser);
      } else {
        // No user is signed in
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * A simple hook to consume the AuthContext in any component
 */
export const useFirebaseUser = () => useContext(AuthContext);

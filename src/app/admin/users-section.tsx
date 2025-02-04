// src/app/admin/users-section.tsx

"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useFirebaseUser } from "@/context/FirebaseAuthContext";
import { useToast } from "@/hooks/use-toast";

type UserDoc = {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;     // Additional field for user avatar
  jobOccupation?: string; // Additional field for occupation
  isAdmin?: boolean;
  isBanned?: boolean;
  [key: string]: unknown; // Replace 'any' with 'unknown'
};

export function UsersSection() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { profile } = useFirebaseUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!profile?.isAdmin) {
      console.log("Access Denied: User is not an admin.");
      setStatusMessage("Access Denied: You do not have permission to view this section.");
      setLoading(false);
      return;
    }

    console.log("Fetching users as admin:", profile?.isAdmin);

    const usersCollection = collection(db, "users");
    const unsubscribe = onSnapshot(
      usersCollection,
      (snapshot) => {
        const fetched: UserDoc[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as UserDoc);
        });
        setUsers(fetched);
        setLoading(false);
        console.log("Fetched Users:", fetched);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setStatusMessage("Unable to fetch users. Check console for details.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile]);

  // Toggle Admin
  const handleToggleAdmin = async (userId: string, newValue: boolean) => {
    console.log(`Toggling admin status for user ${userId} to ${newValue}`);
    try {
      await updateDoc(doc(db, "users", userId), { isAdmin: newValue });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin: newValue } : u))
      );
      setStatusMessage(`Updated admin role for user: ${userId}`);
      toast({
        title: "Success",
        description: `Admin role for user ${userId} updated successfully.`,
      });
    } catch (error) {
      console.error("Error updating admin role:", error);
      setStatusMessage("Error updating admin role. Please try again.");
      toast({
        title: "Error",
        description: "Failed to update admin role.",
        variant: "destructive",
      });
    }
  };

  // Ban/Unban user
  const handleToggleBan = async (userId: string, newValue: boolean) => {
    console.log(`Toggling ban status for user ${userId} to ${newValue}`);
    try {
      await updateDoc(doc(db, "users", userId), { isBanned: newValue });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: newValue } : u))
      );
      setStatusMessage(
        `User ${userId} is now ${newValue ? "banned" : "unbanned"}.`
      );
      toast({
        title: "Success",
        description: `User ${userId} has been ${newValue ? "banned" : "unbanned"}.`,
      });
    } catch (error) {
      console.error("Error updating ban status:", error);
      setStatusMessage("Error updating ban status. Please try again.");
      toast({
        title: "Error",
        description: "Failed to update ban status.",
        variant: "destructive",
      });
    }
  };

  // Remove user from Firestore
  const handleDeleteUser = async (userId: string) => {
    console.log(`Removing user ${userId} from Firestore`);
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setStatusMessage(`User ${userId} removed from Firestore.`);
      toast({
        title: "Success",
        description: `User ${userId} has been removed.`,
      });
    } catch (error) {
      console.error("Error removing user:", error);
      setStatusMessage("Error removing user. Please try again.");
      toast({
        title: "Error",
        description: "Failed to remove user.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (statusMessage && users.length === 0) {
    console.log("Status Message:", statusMessage);
    return (
      <div className="text-center p-8 bg-gray-100 rounded-lg">
        <p className="mb-4 text-gray-600">{statusMessage}</p>
        <p className="text-gray-500">No users found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusMessage && users.length > 0 && (
        <p className="text-sm text-gray-600 border p-2 rounded-md">
          {statusMessage}
        </p>
      )}

      {users.length === 0 ? (
        <div className="text-center p-8 bg-gray-100 rounded-lg">
          <p className="text-gray-500">No users found.</p>
        </div>
      ) : (
        users.map((usr) => (
          <div
            key={usr.id}
            className="flex items-center justify-between p-4 border border-gray-300 rounded-md shadow-sm"
          >
            {/* LEFT SIDE: Avatar & Basic Info */}
            <div className="flex items-center space-x-4">
              {/* Avatar (with fallback if no avatarUrl) */}
              <Image
                src={
                  usr.avatarUrl ||
                  "https://via.placeholder.com/64?text=No+Avatar"
                }
                alt={`${usr.displayName || usr.email} avatar`}
                className="w-12 h-12 rounded-full object-cover"
                width={48}
                height={48}
              />

              <div>
                {/* Display Name (fallback to email or "No display name") */}
                <p className="font-bold">
                  {usr.displayName || usr.email || "No display name"}
                </p>

                {/* Email */}
                {usr.email && (
                  <p className="text-xs text-gray-600">Email: {usr.email}</p>
                )}

                {/* Job Occupation (fallback) */}
                <p className="text-xs text-gray-600">
                  Occupation: {usr.jobOccupation || "N/A"}
                </p>

                {/* Admin / Banned info */}
                <p className="text-xs text-gray-600">
                  Admin: {usr.isAdmin ? "Yes" : "No"}
                </p>
                <p className="text-xs text-gray-600">
                  Banned: {usr.isBanned ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {/* RIGHT SIDE: Action Buttons */}
            <div className="space-x-2">
              {/* Toggle Admin Button */}
              {usr.id !== profile?.uid && ( // Prevent admins from modifying their own admin status
                <Button
                  onClick={() => handleToggleAdmin(usr.id, !usr.isAdmin)}
                  variant="outline"
                >
                  {usr.isAdmin ? "Remove Admin" : "Make Admin"}
                </Button>
              )}

              {/* Ban/Unban Button */}
              {usr.id !== profile?.uid && ( // Prevent admins from banning themselves
                <Button
                  onClick={() => handleToggleBan(usr.id, !usr.isBanned)}
                  variant="outline"
                >
                  {usr.isBanned ? "Unban" : "Ban"}
                </Button>
              )}

              {/* Remove User Button */}
              {usr.id !== profile?.uid && ( // Prevent admins from removing themselves
                <Button
                  onClick={() => handleDeleteUser(usr.id)}
                  variant="destructive"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

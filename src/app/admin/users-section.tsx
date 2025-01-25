"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

type UserDoc = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;     // Additional field for user avatar
  displayName?: string;   // Additional field for display name
  jobOccupation?: string; // Additional field for occupation
  isAdmin?: boolean;
  isBanned?: boolean;
  [key: string]: any;
};

export function UsersSection() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const fetched: UserDoc[] = [];
        snap.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as UserDoc);
        });
        setUsers(fetched);
      } catch (error) {
        console.error("Error fetching users:", error);
        setStatusMessage("Unable to fetch users. Check console for details.");
      }
    };
    fetchUsers();
  }, []);

  // Toggle Admin
  const handleToggleAdmin = async (userId: string, newValue: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), { isAdmin: newValue });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin: newValue } : u))
      );
      setStatusMessage(`Updated admin role for user: ${userId}`);
    } catch (error) {
      console.error("Error updating admin role:", error);
      setStatusMessage("Error updating admin role. Please try again.");
    }
  };

  // Ban/Unban user
  const handleToggleBan = async (userId: string, newValue: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), { isBanned: newValue });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: newValue } : u))
      );
      setStatusMessage(
        `User ${userId} is now ${newValue ? "banned" : "unbanned"}.`
      );
    } catch (error) {
      console.error("Error updating ban status:", error);
      setStatusMessage("Error updating ban status. Please try again.");
    }
  };

  // Remove user from Firestore
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setStatusMessage(`User ${userId} removed from Firestore.`);
    } catch (error) {
      console.error("Error removing user:", error);
      setStatusMessage("Error removing user. Please try again.");
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-100 rounded-lg">
        {statusMessage && <p className="mb-4 text-gray-600">{statusMessage}</p>}
        <p className="text-gray-500">No users found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusMessage && (
        <p className="text-sm text-gray-600 border p-2 rounded-md">
          {statusMessage}
        </p>
      )}

      {users.map((usr) => (
        <div
          key={usr.id}
          className="flex items-center justify-between p-4 border border-gray-300 rounded-md shadow-sm"
        >
          {/* LEFT SIDE: Avatar & Basic Info */}
          <div className="flex items-center space-x-4">
            {/* Avatar (with fallback if no avatarUrl) */}
            <img
              src={
                usr.avatarUrl ||
                "https://via.placeholder.com/64?text=No+Avatar"
              }
              alt={`${usr.displayName || usr.email} avatar`}
              className="w-12 h-12 rounded-full object-cover"
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
            <Button
              onClick={() => handleToggleAdmin(usr.id, !usr.isAdmin)}
              variant="outline"
            >
              {usr.isAdmin ? "Remove Admin" : "Make Admin"}
            </Button>

            {/* Ban/Unban Button */}
            <Button
              onClick={() => handleToggleBan(usr.id, !usr.isBanned)}
              variant="outline"
            >
              {usr.isBanned ? "Unban" : "Ban"}
            </Button>

            {/* Remove User Button */}
            <Button
              onClick={() => handleDeleteUser(usr.id)}
              variant="destructive"
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

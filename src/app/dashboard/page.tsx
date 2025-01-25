"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useFirebaseUser } from "@/context/FirebaseAuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { uploadAvatarImage } from "@/lib/upload";

// ----- Firebase Auth imports needed for password change -----
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

// ----- Toast imports (shadcn or your custom path) -----
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster"; // or wherever your Toaster lives

interface UserData {
  displayName?: string;
  jobOccupation?: string;
  avatarUrl?: string;
  email?: string;
}

interface LocationData {
  id: string;
  name: string;
  status: string;
}

// Component for listing the user's submitted locations
function PlaceStatusList({ locations }: { locations: LocationData[] }) {
  if (!locations.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Submitted Locations</CardTitle>
        <CardDescription>Check status of your places</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {locations.map((loc) => (
          <div key={loc.id} className="border p-3 rounded">
            <p className="font-semibold">{loc.name || "Unnamed"}</p>
            <p className="text-sm">
              <strong>Status:</strong> {loc.status}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useFirebaseUser();

  // ---- Toast hook ----
  const { toast } = useToast();

  const [userData, setUserData] = useState<UserData>({});
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editJob, setEditJob] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [locationsData, setLocationsData] = useState<LocationData[]>([]);

  // ----- Change Password States -----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Determine if user signed in via Email/Password
  const isPasswordProvider = user?.providerData?.some(
    (pd) => pd.providerId === "password"
  );

  // 1) Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login?reason=unauthorized");
    }
  }, [user, router]);

  // 2) Short-circuit if user is null (avoid rendering private info)
  if (!user) {
    return null;
  }

  // Fetch user data and user’s places on mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as UserData;
          setUserData(data);
          setEditDisplayName(data.displayName || "");
          setEditJob(data.jobOccupation || "");
        }
      }
    };

    const fetchUserPlaces = async () => {
      if (user) {
        const q = query(
          collection(db, "remoteWorkLocations"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetched: LocationData[] = [];
        querySnapshot.forEach((docSnap) => {
          const d = docSnap.data();
          fetched.push({
            id: docSnap.id,
            name: (d.name as string) || "",
            status: (d.status as string) || "",
          });
        });
        setLocationsData(fetched);
      }
    };

    fetchUserData();
    fetchUserPlaces();
  }, [user]);

  // ----- Avatar selection -----
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditAvatarFile(e.target.files[0]);
    }
  };

  // ----- Save Profile (name, job, avatar) -----
  const handleSaveProfile = async () => {
    if (!user) return;
    let avatarUrl = userData.avatarUrl || "";

    // If user selected a new file, upload it
    if (editAvatarFile) {
      try {
        avatarUrl = await uploadAvatarImage(user.uid, editAvatarFile);
      } catch (error) {
        console.error("Avatar upload error:", error);
        toast({
          title: "Error",
          description: "Failed to upload avatar. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          displayName: editDisplayName,
          jobOccupation: editJob,
          avatarUrl,
        },
        { merge: true }
      );
      setUserData((prev) => ({
        ...prev,
        displayName: editDisplayName,
        jobOccupation: editJob,
        avatarUrl,
      }));
      setEditAvatarFile(null);

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Error updating profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ----- Handle Change Password (only for Email/Password users) -----
  const handleChangePassword = async () => {
    if (!user?.email) return; // Shouldn't happen, but just in case
    if (!currentPassword || !newPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in both current and new password.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Re-authenticate with current password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Now update to the new password
      await updatePassword(user, newPassword);

      // Clear fields
      setCurrentPassword("");
      setNewPassword("");

      toast({
        title: "Success",
        description: "Password changed successfully!",
      });
    } catch (error: any) {
      console.error("Change password error:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto py-10 flex-grow">
        <h1 className="text-4xl font-bold mb-8">User Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* --- Profile Card --- */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile here</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <Input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                />
              </div>

              {/* Job Occupation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Occupation
                </label>
                <Input
                  type="text"
                  value={editJob}
                  onChange={(e) => setEditJob(e.target.value)}
                />
              </div>

              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar
                </label>
                {userData.avatarUrl && (
                  <div className="mb-2 relative w-24 h-24">
                    <Image
                      src={userData.avatarUrl}
                      alt="Avatar"
                      fill
                      className="object-cover rounded-full"
                    />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Save Button */}
              <Button onClick={handleSaveProfile} disabled={!editDisplayName}>
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* --- Locations Status Card --- */}
          <PlaceStatusList locations={locationsData} />
        </div>

        {/* ----- Conditional: Change Password (only for email/password users) ----- */}
        {isPasswordProvider && (
          <div className="mt-8 max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your account password here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <Button onClick={handleChangePassword}>Update Password</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* The toaster to display our toast messages */}
      <Toaster />
    </div>
  );
}

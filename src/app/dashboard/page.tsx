"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseUser } from "@/context/FirebaseAuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import Image from "next/image";
import { uploadAvatarImage } from "@/lib/upload";

// Firebase Auth imports for password change
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

// Toast notifications
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

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
  const { toast } = useToast();

  const [userData, setUserData] = useState<UserData>({});
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editJob, setEditJob] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [locationsData, setLocationsData] = useState<LocationData[]>([]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Check if user signed in via Email/Password
  const isPasswordProvider = user?.providerData?.some(
    (pd) => pd.providerId === "password"
  );

  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login?reason=unauthorized");
    }
  }, [user, router]);

  // Fetch user data and locations
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserData;
        setUserData(data);
        setEditDisplayName(data.displayName || "");
        setEditJob(data.jobOccupation || "");
      }
    };

    const fetchUserPlaces = async () => {
      const q = query(
        collection(db, "remoteWorkLocations"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetched: LocationData[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || "",
        status: docSnap.data().status || "",
      }));
      setLocationsData(fetched);
    };

    fetchUserData();
    fetchUserPlaces();
  }, [user]);

  // Handle Avatar Selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditAvatarFile(e.target.files[0]);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async () => {
    if (!user) return;
    let avatarUrl = userData.avatarUrl || "";

    if (editAvatarFile) {
      try {
        avatarUrl = await uploadAvatarImage(user.uid, editAvatarFile);
      } catch {
        toast({
          title: "Error",
          description: "Failed to upload avatar. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await setDoc(
        doc(db, "users", user.uid),
        { displayName: editDisplayName, jobOccupation: editJob, avatarUrl },
        { merge: true }
      );
      setUserData({ ...userData, displayName: editDisplayName, jobOccupation: editJob, avatarUrl });
      setEditAvatarFile(null);

      toast({ title: "Success", description: "Profile updated successfully!" });
    } catch {
      toast({ title: "Error", description: "Error updating profile.", variant: "destructive" });
    }
  };

  // Handle Password Change
  const handleChangePassword = async () => {
    if (!user?.email) return;
    if (!currentPassword || !newPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in both current and new password.",
        variant: "destructive",
      });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Success", description: "Password changed successfully!" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="relative w-full min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto py-10 flex-grow">
        <h1 className="text-4xl font-bold mb-8">User Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile here</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Display Name" />
              <Input type="text" value={editJob} onChange={(e) => setEditJob(e.target.value)} placeholder="Job Occupation" />
              {userData.avatarUrl && <Image src={userData.avatarUrl} alt="Avatar" width={96} height={96} className="rounded-full" />}
              <Input type="file" accept="image/*" onChange={handleAvatarChange} />
              <Button onClick={handleSaveProfile} disabled={!editDisplayName}>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Locations List */}
          <PlaceStatusList locations={locationsData} />
        </div>

        {/* Change Password */}
        {isPasswordProvider && (
          <Card className="mt-8 max-w-md">
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <Input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Button onClick={handleChangePassword}>Update Password</Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  );
}

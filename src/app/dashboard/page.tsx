"use client";

import { useEffect, useState, useCallback } from "react";
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
import NextImage from "next/image";
import { uploadAvatarImage } from "@/lib/upload";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { AvatarCrop } from "@/app/dashboard/AvatarCrop";

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

// Predefined job options (each ≤ 12 chars)
const jobOptions = [
  "Photographer",
  "Developer",
  "Designer",
  "Writer",
  "Artist",
  "Manager",
  "Engineer",
  "Consultant",
  "Teacher",
  "Nurse",
  "Accountant",
  "Architect",
];

function PlaceStatusList({ locations }: { locations: LocationData[] }) {
  if (!locations.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Submitted Locations</CardTitle>
        <CardDescription>Check the status of your places</CardDescription>
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
  const { user, profile, loading } = useFirebaseUser();
  const { toast } = useToast();

  const [userData, setUserData] = useState<UserData>({});
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editJob, setEditJob] = useState("");
  const [locationsData, setLocationsData] = useState<LocationData[]>([]);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Avatar and cropping states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  // Check if the user signed in with Email/Password
  const isPasswordProvider = user?.providerData?.some(
    (pd: any) => pd.providerId === "password"
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?reason=unauthorized");
    }
  }, [user, loading, router]);

  // Fetch user data and their locations
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

  // Handle avatar file selection -> open crop modal
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      setCropModalOpen(true);
    }
  };

  // Callback for AvatarCrop
  const handleCropComplete = useCallback((blob: Blob) => {
    setCroppedBlob(blob);
    setCropModalOpen(false);
  }, []);

  // Save profile changes, including uploading the cropped avatar
  const handleSaveProfile = async () => {
    if (!user) return;

    let avatarUrl = userData.avatarUrl || "";

    if (croppedBlob) {
      try {
        // Show toast that we're uploading the image
        toast({
          title: "Upload image",
          description: "Your image is being uploaded to the server. Please wait...",
          variant: "default",
        });

        // Convert cropped blob to File
        const file = new File([croppedBlob], avatarFile?.name || "avatar.png", {
          type: avatarFile?.type || "image/png",
        });
        avatarUrl = await uploadAvatarImage(user.uid, file);
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
      await setDoc(
        doc(db, "users", user.uid),
        { displayName: editDisplayName, jobOccupation: editJob, avatarUrl },
        { merge: true }
      );
      setUserData({
        ...userData,
        displayName: editDisplayName,
        jobOccupation: editJob,
        avatarUrl,
      });
      // Reset avatar states
      setAvatarFile(null);
      setCroppedBlob(null);

      toast({
        title: "Success",
        description: "Profile updated successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: "Error updating profile.",
        variant: "destructive",
      });
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!user?.email) return;
    if (!currentPassword || !newPassword) {
      toast({
        title: "Missing Fields",
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
      toast({
        title: "Success",
        description: "Password changed successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error("Password change error:", error);
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative w-full min-h-screen flex flex-col">
      <div className="container mx-auto py-8 mt-[100px] flex-grow">
        <h1 className="text-4xl font-bold mb-8">User Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile here</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display Name input (max 10 chars) */}
              <Input
                type="text"
                value={editDisplayName}
                onChange={(e) => {
                  if (e.target.value.length <= 10) {
                    setEditDisplayName(e.target.value);
                  } else {
                    toast({
                      title: "Character Limit",
                      description: "Display Name cannot exceed 10 characters.",
                      variant: "destructive",
                    });
                  }
                }}
                placeholder="Display Name"
              />

              {/* Job Occupation select */}
              <Select value={editJob} onValueChange={(value) => setEditJob(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Job Occupation" />
                </SelectTrigger>
                <SelectContent>
                  {jobOptions.map((job) => (
                    <SelectItem key={job} value={job}>
                      {job}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Current avatar display */}
              {userData.avatarUrl && (
                <div className="flex">
                  <NextImage
                    src={userData.avatarUrl}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="rounded-full object-cover"
                  />
                </div>
              )}

              {/* Avatar file input */}
              <Input type="file" accept="image/*" onChange={handleAvatarChange} />

              {/* Crop modal */}
              {cropModalOpen && avatarFile && (
                <AvatarCrop
                  imageSrc={URL.createObjectURL(avatarFile)}
                  onCropCompleteAction={handleCropComplete}
                />
              )}

              {/* Cropped avatar preview */}
              {croppedBlob && (
                <div className="mt-4 flex justify-center">
                  <NextImage
                    src={URL.createObjectURL(croppedBlob)}
                    alt="Cropped Avatar"
                    width={120}
                    height={120}
                    className="rounded-full object-cover"
                  />
                </div>
              )}

              {/* Save profile button */}
              <Button onClick={handleSaveProfile} disabled={!editDisplayName}>
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* User's submitted locations */}
          <PlaceStatusList locations={locationsData} />
        </div>

        {/* Password change section */}
        {isPasswordProvider && (
          <Card className="mt-8 max-w-md">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button onClick={handleChangePassword}>Update Password</Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  );
}

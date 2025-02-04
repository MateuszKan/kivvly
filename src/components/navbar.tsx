"use client"; // Ensure this is at the top if using client-side features

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useFirebaseUser } from "@/context/FirebaseAuthContext";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import AddPlaceButton from "@/components/AddPlaceButton";
import AdminButton from "@/components/AdminButton";
import LoginButton from "@/components/LoginButton";
import Logo from "@/components/ui/logo"; // Import the new Logo component
import { useToast } from "@/hooks/use-toast"; // Ensure this path is correct
import { uploadAvatarImage } from "@/lib/upload"; // Ensure this function uploads to Firebase Storage
import Image from "next/image"; // Import Next.js Image component
import { Camera, User, LogOut } from "lucide-react"; // Ensure icons are imported

interface UserProfile {
  displayName?: string;
  avatarUrl?: string;
  jobOccupation?: string;
  isAdmin?: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const { user, profile, loading } = useFirebaseUser();
  const { toast } = useToast();
  const [localProfile, setLocalProfile] = useState<UserProfile>({});

  // State for avatar upload
  const [isUploading, setIsUploading] = useState(false);

  // Reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      setLocalProfile({});
      return;
    }

    if (profile) {
      setLocalProfile(profile);
    } else {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          setLocalProfile(snapshot.data() as UserProfile);
        }
      });

      return () => unsubscribe();
    }
  }, [user, profile]);

  const handleLogin = () => {
    router.push("/login");
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const displayName = localProfile.displayName || user?.displayName || "User";
  const avatarUrl = localProfile.avatarUrl || user?.photoURL || "/default-avatar.png";
  const jobOccupation = localProfile.jobOccupation || "";

  // Handle avatar selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadAvatar(e.target.files[0]);
    }
  };

  // Handle avatar upload
  const handleUploadAvatar = async (file: File) => {
    if (!user) return;
    setIsUploading(true);
    try {
      // Upload the avatar image and get the URL
      const newAvatarUrl = await uploadAvatarImage(user.uid, file);

      // Update Firestore with the new avatar URL
      await setDoc(
        doc(db, "users", user.uid),
        { avatarUrl: newAvatarUrl },
        { merge: true }
      );

      toast({
        title: "Success",
        description: "Avatar updated successfully!",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger the hidden file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <nav
      className={`p-2 fixed top-0 left-0 right-0 z-10 flex items-center justify-between border-b bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl`}
    >
      {/* Glossy Overlay */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent dark:from-gray-700/40 dark:to-transparent pointer-events-none"></div>

      {/* Left side: Logo and Buttons */}
      <div className="flex items-center gap-2 space-x-2 z-10">
        <Logo /> {/* Use the Logo component here */}

        <AddPlaceButton onClick={() => router.push("/addplace")} />

        {/* Conditionally render AdminButton */}
        {user && localProfile.isAdmin && (
          <AdminButton onClick={() => router.push("/admin")} />
        )}
      </div>

      {/* Right side: Loading, Profile Dropdown, or Login Button */}
      <div className="z-10">
        {loading ? (
          <div className="flex items-center justify-center h-6 w-6">
            <div className="w-6 h-6 border-2 border-t-transparent border-solid rounded-full animate-spin"></div>
          </div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
  <button className="flex items-center space-x-3 bg-transparent border-none px-2 py-1 relative">
    {/* Avatar z nakładką podczas uploadu */}
    <div className="relative">
      {localProfile.avatarUrl ? (
        <Image
          src={localProfile.avatarUrl}
          alt="Avatar"
          width={40}
          height={40}
          className="rounded-full object-cover"
          loading="eager"
        />
      ) : (
        // Fallback do domyślnego awatara
        <Image
          src="/default-avatar.png"
          alt="Default Avatar"
          width={40}
          height={40}
          className="rounded-full object-cover"
          loading="eager"
        />
      )}

      {/* Nakładka wyświetlana podczas uploadu */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-300 bg-opacity-50 rounded-full">
          {/* Możesz też użyć ikony ładowania zamiast tekstu */}
          <span className="text-xs text-gray-700">Uploading</span>
        </div>
      )}
    </div>

    <div className="flex flex-col items-start leading-tight">
      <span className="font-semibold">{displayName}</span>
      {jobOccupation && (
        <span className="text-xs text-gray-500">{jobOccupation}</span>
      )}
    </div>
    {/* Ukryty input do wyboru pliku */}
    <input
      type="file"
      accept="image/*"
      ref={fileInputRef}
      onChange={handleAvatarChange}
      className="hidden"
    />
  </button>
</DropdownMenuTrigger>


            <DropdownMenuContent className="z-50">
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <User className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <LoginButton onClick={handleLogin} />
        )}
      </div>
    </nav>
  );
}

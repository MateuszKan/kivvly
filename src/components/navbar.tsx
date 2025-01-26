"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { User, LogOut } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { useFirebaseUser } from "@/context/FirebaseAuthContext"
import { doc, onSnapshot } from "firebase/firestore"

// Import your custom button components
import AddPlaceButton from "@/components/AddPlaceButton"
import AdminButton from "@/components/AdminButton"
import LoginButton from "@/components/LoginButton"
import Image from "next/image";

/** Shape of your user doc in Firestore */
interface UserProfile {
  displayName?: string
  avatarUrl?: string
  jobOccupation?: string
  isAdmin?: boolean
}

export default function Navbar() {
  const router = useRouter()
  const { user, loading } = useFirebaseUser()
  const [profile, setProfile] = useState<UserProfile>({})

  // Listen to Firestore for real-time user profile changes
  useEffect(() => {
    if (!user) {
      setProfile({})
      return
    }

    const userDocRef = doc(db, "users", user.uid)
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile)
      }
    })

    return () => unsubscribe()
  }, [user])

  const handleLogin = () => {
    router.push("/login")
  }

  const handleSignOut = async () => {
    await signOut(auth)
  }

  const displayName = profile.displayName || user?.displayName || "User"
  const avatarUrl = profile.avatarUrl || user?.photoURL || "/default-avatar.png"
  const jobOccupation = profile.jobOccupation || ""

  return (
    <nav className="p-4 flex items-center justify-between border-b border-gray-200">
      {/* Left side: Logo and Buttons */}
      <div className="flex items-center space-x-2">
        {/* Logo as a link */}
        <Link href="/" className="flex items-center">
          <Image
            src="/kivvly.svg"
            alt="Kivvly Logo"
            className="mr-2 h-6 w-auto sm:h-8 md:h-10"
            width={100}
            height={100}
          />
        </Link>

        {/* Add Place Button */}
        <AddPlaceButton onClick={() => router.push("/addplace")} />

        {/* Conditionally show Admin button if user is logged in and isAdmin */}
        {user && profile.isAdmin && (
          <AdminButton onClick={() => router.push("/admin")} />
        )}
      </div>

      {/* Right side: Loading, Profile Dropdown, or Login Button */}
      <div>
        {loading ? (
          /* Replace "Loading..." with a spinner */
          <div className="flex items-center justify-center h-6 w-6">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent border-solid rounded-full animate-spin"></div>
          </div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-3 bg-transparent border-none px-2 py-1">
                <Avatar>
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>
                    {displayName.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-semibold">{displayName}</span>
                  {jobOccupation && (
                    <span className="text-xs text-gray-500">{jobOccupation}</span>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
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
  )
}

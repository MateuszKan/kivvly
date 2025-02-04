"use client"

import { useState, useEffect } from "react"
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { useFirebaseUser } from "@/context/FirebaseAuthContext"
import { useToast } from "@/hooks/use-toast"
import { MoreHorizontal, Search, ChevronLeft, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

type UserDoc = {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
  jobOccupation?: string
  isAdmin?: boolean
  isBanned?: boolean
  createdAt?: number
  [key: string]: unknown
}

export function UsersSection() {
  const [users, setUsers] = useState<UserDoc[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const usersPerPage = 10

  const { profile } = useFirebaseUser()
  const { toast } = useToast()

  useEffect(() => {
    if (!profile?.isAdmin) {
      console.log("Access Denied: User is not an admin.")
      setStatusMessage("Access Denied: You do not have permission to view this section.")
      setLoading(false)
      return
    }

    console.log("Fetching users as admin:", profile?.isAdmin)
    const usersCollection = collection(db, "users")
    const q = query(usersCollection, orderBy("createdAt", "desc"), limit(100))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: UserDoc[] = []
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as UserDoc)
        })
        console.log("Fetched Users:", fetched)
        setUsers(fetched)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching users:", error)
        setStatusMessage("Unable to fetch users. Please try again later.")
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [profile])

  const handleToggleAdmin = async (userId: string, newValue: boolean) => {
    console.log(`Toggling admin status for user ${userId} to ${newValue}`)
    try {
      await updateDoc(doc(db, "users", userId), { isAdmin: newValue })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin: newValue } : u)),
      )
      toast({
        title: "Success",
        description: `Admin status updated for user ${userId}.`,
      })
    } catch (error) {
      console.error("Error updating admin role:", error)
      toast({
        title: "Error",
        description: "Failed to update admin status.",
        variant: "destructive",
      })
    }
  }

  const handleToggleBan = async (userId: string, newValue: boolean) => {
    console.log(`Toggling ban status for user ${userId} to ${newValue}`)
    try {
      await updateDoc(doc(db, "users", userId), { isBanned: newValue })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: newValue } : u)),
      )
      toast({
        title: "Success",
        description: `User ${userId} has been ${newValue ? "banned" : "unbanned"}.`,
      })
    } catch (error) {
      console.error("Error updating ban status:", error)
      toast({
        title: "Error",
        description: "Failed to update ban status.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    console.log(`Removing user ${userId} from Firestore`)
    try {
      await deleteDoc(doc(db, "users", userId))
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast({
        title: "Success",
        description: `User ${userId} has been removed.`,
      })
    } catch (error) {
      console.error("Error removing user:", error)
      toast({
        title: "Error",
        description: "Failed to remove user.",
        variant: "destructive",
      })
    }
  }

  // Filter users based on search term (by name, email, or occupation)
  const filteredUsers = users.filter(
    (user) =>
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.jobOccupation?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Pagination calculations
  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    )
  }

  if (statusMessage && users.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-100 rounded-lg">
        <p className="text-gray-600">{statusMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search users..."
            className="pl-8 pr-4 w-full"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to first page on search
            }}
          />
        </div>
      </div>

      {/* Optionally display a status message */}
      {statusMessage && users.length > 0 && (
        <p className="text-sm text-gray-600 border p-2 rounded-md">{statusMessage}</p>
      )}

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center p-8 bg-gray-100 rounded-lg">
          <p className="text-gray-500">No users found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentUsers.map((usr) => (
            <Card key={usr.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Image
                      src={usr.avatarUrl || "/placeholder.svg?height=40&width=40"}
                      alt={`${usr.displayName || usr.email} avatar`}
                      className="rounded-full"
                      width={40}
                      height={40}
                    />
                    <div>
                      <p className="font-semibold">{usr.displayName || "No display name"}</p>
                      <p className="text-sm text-gray-500">{usr.email}</p>
                    </div>
                  </div>
                  {usr.id !== profile?.uid && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleAdmin(usr.id, !usr.isAdmin)}>
                          {usr.isAdmin ? "Remove Admin" : "Make Admin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleBan(usr.id, !usr.isBanned)}>
                          {usr.isBanned ? "Unban" : "Ban"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUser(usr.id)}>
                          Remove User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Occupation: {usr.jobOccupation || "N/A"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {usr.isAdmin && <Badge>Admin</Badge>}
                  {usr.isBanned && <Badge variant="destructive">Banned</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredUsers.length > usersPerPage && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <p className="text-sm text-gray-600">
            Showing {indexOfFirstUser + 1} to{" "}
            {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => paginate(currentPage + 1)}
              disabled={indexOfLastUser >= filteredUsers.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

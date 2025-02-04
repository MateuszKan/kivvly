"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Pencil, Trash2, Search, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Place = {
  id: string
  name: string
  status: "pending" | "approved" | "rejected"
  amenities?: string[]
  images?: string[]
  address?: string
  [key: string]: unknown
}

export function PlacesTable() {
  const [places, setPlaces] = useState<Place[]>([])
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingPlace, setEditingPlace] = useState<Place | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const placesPerPage = 6

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const snap = await getDocs(collection(db, "remoteWorkLocations"))
        const fetched: Place[] = []
        snap.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as Place)
        })
        setPlaces(fetched)
        setFilteredPlaces(fetched)
      } catch (error) {
        console.error("Error fetching places:", error)
        setStatusMessage("Unable to fetch places. Check console for details.")
      }
    }
    fetchLocations()
  }, [])

  useEffect(() => {
    const filtered = places.filter(
      (place) =>
        place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.amenities?.some((amenity) => amenity.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    setFilteredPlaces(filtered)
    setCurrentPage(1)
  }, [searchTerm, places])

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, "remoteWorkLocations", id), { status: "approved" })
      updatePlaceStatus(id, "approved")
      setStatusMessage("Place approved successfully!")
    } catch (error) {
      console.error("Error approving place:", error)
      setStatusMessage("Error approving place. Please try again.")
    }
  }

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, "remoteWorkLocations", id), { status: "rejected" })
      updatePlaceStatus(id, "rejected")
      setStatusMessage("Place rejected successfully!")
    } catch (error) {
      console.error("Error rejecting place:", error)
      setStatusMessage("Error rejecting place. Please try again.")
    }
  }

  const handleEdit = (place: Place) => {
    setEditingPlace(place)
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingPlace) return

    try {
      await updateDoc(doc(db, "remoteWorkLocations", editingPlace.id), {
        name: editingPlace.name,
        address: editingPlace.address,
        amenities: editingPlace.amenities,
      })
      setPlaces((prev) => prev.map((p) => (p.id === editingPlace.id ? editingPlace : p)))
      setFilteredPlaces((prev) => prev.map((p) => (p.id === editingPlace.id ? editingPlace : p)))
      setStatusMessage("Place updated successfully!")
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating place:", error)
      setStatusMessage("Error updating place. Please try again.")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "remoteWorkLocations", id))
      setPlaces((prev) => prev.filter((p) => p.id !== id))
      setFilteredPlaces((prev) => prev.filter((p) => p.id !== id))
      setStatusMessage("Place deleted successfully!")
    } catch (error) {
      console.error("Error deleting place:", error)
      setStatusMessage("Error deleting place. Please try again.")
    }
  }

  const updatePlaceStatus = (id: string, newStatus: "approved" | "rejected") => {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)))
    setFilteredPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)))
  }

  const indexOfLastPlace = currentPage * placesPerPage
  const indexOfFirstPlace = indexOfLastPlace - placesPerPage
  const currentPlaces = filteredPlaces.slice(indexOfFirstPlace, indexOfLastPlace)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Remote Work Locations</h2>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search places..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-4 w-full sm:w-64"
          />
        </div>
      </div>

      {statusMessage && <p className="mb-2 text-sm text-gray-600 bg-gray-100 p-2 rounded">{statusMessage}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentPlaces.map((place) => (
          <Card key={place.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{place.name}</span>
                <Badge
                  variant={
                    place.status === "approved" ? "default" : place.status === "pending" ? "secondary" : "destructive"
                  }
                >
                  {place.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">{place.address || "No address provided"}</p>
              <p className="text-sm font-medium mb-1">Amenities:</p>
              <p className="text-sm text-gray-600 mb-2">
                {place.amenities && place.amenities.length > 0 ? place.amenities.join(", ") : "No amenities listed"}
              </p>
              {place.images && place.images.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      View Images
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>{place.name} - Images</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {place.images.map((img, index) => (
                        <Image
                          key={index}
                          src={img || "/placeholder.svg"}
                          alt={`${place.name} image ${index + 1}`}
                          width={300}
                          height={200}
                          className="rounded-lg object-cover w-full h-48"
                        />
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {place.status === "pending" && (
                <div className="flex space-x-2">
                  <Button onClick={() => handleApprove(place.id)} size="sm">
                    Approve
                  </Button>
                  <Button onClick={() => handleReject(place.id)} variant="destructive" size="sm">
                    Reject
                  </Button>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(place)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(place.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredPlaces.length === 0 && <p className="text-center text-gray-500 py-4">No places found.</p>}

      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
        <p className="text-sm text-gray-600">
          Showing {indexOfFirstPlace + 1} to {Math.min(indexOfLastPlace, filteredPlaces.length)} of{" "}
          {filteredPlaces.length} places
        </p>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => paginate(currentPage + 1)}
            disabled={indexOfLastPlace >= filteredPlaces.length}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Place</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingPlace?.name || ""}
                  onChange={(e) => setEditingPlace((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={editingPlace?.address || ""}
                  onChange={(e) => setEditingPlace((prev) => (prev ? { ...prev, address: e.target.value } : null))}
                />
              </div>
              <div>
                <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                <Textarea
                  id="amenities"
                  value={editingPlace?.amenities?.join(", ") || ""}
                  onChange={(e) =>
                    setEditingPlace((prev) =>
                      prev
                        ? {
                            ...prev,
                            amenities: e.target.value.split(",").map((item) => item.trim()),
                          }
                        : null,
                    )
                  }
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

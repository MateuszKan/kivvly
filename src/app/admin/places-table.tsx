"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

type Place = {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  amenities?: string[];
  [key: string]: unknown; // Replace 'any' with 'unknown'
};

export function PlacesTable() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const snap = await getDocs(collection(db, "remoteWorkLocations"));
        const fetched: Place[] = [];
        snap.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as Place);
        });
        setPlaces(fetched);
      } catch (error) {
        console.error("Error fetching places:", error);
        setStatusMessage("Unable to fetch places. Check console for details.");
      }
    };
    fetchLocations();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, "remoteWorkLocations", id), { status: "approved" });
      setPlaces((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p))
      );
      setStatusMessage("Place approved successfully!");
    } catch (error) {
      console.error("Error approving place:", error);
      setStatusMessage("Error approving place. Please try again.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      // Option A: Mark it as "rejected"
      await updateDoc(doc(db, "remoteWorkLocations", id), { status: "rejected" });
      setPlaces((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p))
      );
      setStatusMessage("Place rejected successfully!");

      // Option B: Or remove from Firestore (if you prefer a true delete)
      // await deleteDoc(doc(db, "remoteWorkLocations", id));
      // setPlaces((prev) => prev.filter((p) => p.id !== id));
      // setStatusMessage("Place removed successfully!");
    } catch (error) {
      console.error("Error rejecting place:", error);
      setStatusMessage("Error rejecting place. Please try again.");
    }
  };

  const handleEdit = (id: string) => {
    // Implement your own UI for editing the place's name, etc.
    console.log("Edit place with ID:", id);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "remoteWorkLocations", id));
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      setStatusMessage("Place deleted successfully!");
    } catch (error) {
      console.error("Error deleting place:", error);
      setStatusMessage("Error deleting place. Please try again.");
    }
  };

  return (
    <div>
      {statusMessage && (
        <p className="mb-2 text-sm text-gray-600">{statusMessage}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amenities</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {places.map((place) => (
            <TableRow key={place.id}>
              <TableCell>{place.name}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    place.status === "approved"
                      ? "default"
                      : place.status === "pending"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {place.status}
                </Badge>
              </TableCell>
              <TableCell>
                {place.amenities && place.amenities.length > 0
                  ? place.amenities.join(", ")
                  : "—"}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  {/* Approve & Reject only if status is pending */}
                  {place.status === "pending" && (
                    <>
                      <Button onClick={() => handleApprove(place.id)} size="sm">
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(place.id)}
                        variant="destructive"
                        size="sm"
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {/* Edit Button */}
                  <Button onClick={() => handleEdit(place.id)} variant="outline" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>

                  {/* Delete Button */}
                  <Button onClick={() => handleDelete(place.id)} variant="outline" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {places.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                <p className="text-center text-gray-500">No places found.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

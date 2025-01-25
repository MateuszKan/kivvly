"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseUser } from "@/context/FirebaseAuthContext";
import { PlacesTable } from "./places-table";
import { UsersSection } from "./users-section";
import Navbar from "@/components/navbar"; // <-- import your Navbar

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useFirebaseUser();

  // If the user is not logged in, redirect to login
  useEffect(() => {
    if (!user) {
      router.push("/login?reason=unauthorized");
    }
  }, [user, router]);

  // If no user or still loading, short-circuit
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Include the Navbar at the top */}
      <Navbar />

      <div className="container mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        {/* Places Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">All Places</h2>
          <PlacesTable />
        </section>

        {/* Users Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">All Users</h2>
          <UsersSection />
        </section>
      </div>
    </>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseUser } from "@/context/FirebaseAuthContext";
import { useToast } from "@/hooks/use-toast";

import { PlacesTable } from "./places-table";
import { UsersSection } from "./users-section";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, profile, loading } = useFirebaseUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to access the admin dashboard.",
          variant: "destructive",
        });
        router.push("/login");
      } else if (!profile?.isAdmin) {
        toast({
          title: "Access Denied",
          description: "You do not have permission to view this page.",
          variant: "destructive",
        });
        router.push("/login");
      }
    }
  }, [user, profile, loading, router, toast]);

  // Loader
  if (loading || !user || !profile?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 mt-[100px] space-y-8">
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
  );
}

"use client";

import { useState } from "react";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface CrosshairButtonProps {
  /**
   * Callback triggered after successfully retrieving the user's coords.
   * Example usage:
   *   <CrosshairButton onLocateAction={(lat, lng) => setCenter({ lat, lng })} />
   */
  onLocateAction: (latitude: number, longitude: number) => void;
}

export default function CrosshairButton({ onLocateAction }: CrosshairButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const { toast } = useToast();

  const handleClick = () => {
    if (!("geolocation" in navigator)) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    // Show the "pulse" animation
    setIsActive(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Stop the animation
        setIsActive(false);

        // Pass coords back to the parent so it can do something with them (e.g. center the map)
        onLocateAction(position.coords.latitude, position.coords.longitude);

        // Optional success toast
        toast({
          title: "Target Acquired",
          description: `Latitude: ${position.coords.latitude}, Longitude: ${position.coords.longitude}`,
        });
      },
      (error) => {
        // Stop the animation
        setIsActive(false);

        // Show a toast explaining the error
        toast({
          title: "Unable to retrieve your location",
          description: error.message,
          variant: "destructive",
        });
      }
    );
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isActive}
      className={`
        group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600
        text-white hover:from-indigo-600 hover:to-purple-700 transition-all duration-300
        p-3 rounded-full shadow-lg
        ${isActive ? "animate-pulse" : ""}
      `}
    >
      {/* Shimmer/beam effect on hover */}
      <span
        className="absolute inset-0 bg-gradient-to-r
          from-transparent via-white to-transparent opacity-20
          transform rotate-45 translate-x-[-50%]
          group-hover:translate-x-[100%]
          transition-transform duration-700
        "
      ></span>

      {/* Actual icon content */}
      <span className="relative flex items-center justify-center">
        <Crosshair className="w-6 h-6" />
      </span>
    </Button>
  );
}

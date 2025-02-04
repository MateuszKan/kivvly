"use client";

import { LoadScript } from "@react-google-maps/api";
import React from "react";

const libraries: ("places")[] = ["places"];

// This loads the script ONCE for everything that’s nested inside
export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  return (
    <LoadScript
    loadingElement={<div></div>}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      libraries={libraries}
    >
      {children}
    </LoadScript>
  );
}

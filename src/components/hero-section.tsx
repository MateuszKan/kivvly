"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  Autocomplete,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import Navbar from "@/components/navbar";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { GoogleMapPinCard } from "@/components/google-map-pin-card";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import CrosshairButton from "@/components/CrosshairButton";

/** Grayscale styles for the map only */
const grayscaleStyle: google.maps.MapTypeStyle[] = [
  /* ... your grayscale styles here ... */
];

const defaultCenter = { lat: 40.7128, lng: -74.006 };

// Marker icons
const MARKER_ICON = {
  url: "/marker.svg",
  scaledSize: new google.maps.Size(40, 40),
  anchor: new google.maps.Point(20, 40),
};

/**
 * A pulsating user marker with animation.
 * Larger size (60x60) so pulsation is more noticeable.
 */
const USER_MARKER_ICON = {
  url:
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <circle cx="30" cy="30" r="10" fill="blue" opacity="1"/>
      <circle cx="30" cy="30" r="20" fill="blue" opacity="0.5">
        <animate attributeName="r" from="20" to="30" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `),
  scaledSize: new google.maps.Size(60, 60),
  anchor: new google.maps.Point(15, 15),
};

const amenityLabelToValue = {
  "Power Outlets": "powerSocket",
  "Quiet Environment": "quietEnvironment",
  "Wi-Fi": "wifi",
  Toilets: "toilets",
};

interface AmenityFilters {
  toilets: boolean;
  wifi: boolean;
  quietEnvironment: boolean;
  powerSocket: boolean;
}

const amenityIcons = [
  { key: "toilets", icon: "🚽" },
  { key: "wifi", icon: "📶" },
  { key: "quietEnvironment", icon: "🤫" },
  { key: "powerSocket", icon: "🔌" },
];

export default function HeroSection() {
  const router = useRouter();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);

  const [filters, setFilters] = useState<AmenityFilters>({
    toilets: false,
    wifi: false,
    quietEnvironment: false,
    powerSocket: false,
  });

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  // Track if Crosshair has already applied the +3 zoom once
  const [hasCrosshairZoomed, setHasCrosshairZoomed] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileOrTablet(window.innerWidth <= 1024);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // 1. Get approximate IP location
  useEffect(() => {
    const fetchIPLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error("Failed to fetch IP-based location");
        const data = await res.json();
        setCenter({ lat: data.latitude, lng: data.longitude });
      } catch (error) {
        console.warn("IP-based geolocation failed; using default center.", error);
        setCenter(defaultCenter);
      }
    };
    fetchIPLocation();
  }, []);

  // 2. Fetch Firestore
  useEffect(() => {
    const fetchLocations = async () => {
      const querySnapshot = await getDocs(collection(db, "remoteWorkLocations"));
      const fetched: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "approved") {
          fetched.push({ id: docSnap.id, ...data });
        }
      });
      setAllLocations(fetched);
      setFilteredLocations(fetched);
    };
    fetchLocations();
  }, []);

  // 3. Filter locations
  useEffect(() => {
    const newFiltered = allLocations.filter((loc) => {
      const amArr = Array.isArray(loc.amenities) ? loc.amenities : [];
      if (filters.toilets && !amArr.includes("toilets")) return false;
      if (filters.wifi && !amArr.includes("wifi")) return false;
      if (filters.quietEnvironment && !amArr.includes("quietEnvironment")) return false;
      if (filters.powerSocket && !amArr.includes("powerSocket")) return false;
      return true;
    });
    setFilteredLocations(newFiltered);
  }, [filters, allLocations]);

  // Toggle filter (mobile/tablet icon usage)
  const toggleFilter = (amenityKey: keyof AmenityFilters) => {
    setFilters((prev) => ({ ...prev, [amenityKey]: !prev[amenityKey] }));
  };

  // Checkbox usage (desktop)
  const handleCheckboxChange = (amenityLabel: string, checked: boolean) => {
    const amenityKey =
      amenityLabelToValue[amenityLabel as keyof typeof amenityLabelToValue];
    setFilters((prev) => ({ ...prev, [amenityKey]: checked }));
  };

  // Map
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onAutocompleteLoad = (instance: google.maps.places.Autocomplete) => {
    setAutocomplete(instance);
  };

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place?.geometry?.location) {
      setCenter({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    }
  };

  // Custom zoom handlers for desktop
  const zoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom() || 12;
      map.setZoom(currentZoom + 1);
    }
  };

  const zoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom() || 12;
      map.setZoom(currentZoom - 1);
    }
  };

  // If center is null, show loader
  if (!center) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  function getAmenityArray(amenities: string[]) {
    if (!Array.isArray(amenities)) return [];
    const arr: { id: string; label: string }[] = [];
    if (amenities.includes("toilets")) {
      arr.push({ id: "toilets", label: "Toilets" });
    }
    if (amenities.includes("wifi")) {
      arr.push({ id: "wifi", label: "Wi-Fi" });
    }
    if (amenities.includes("quietEnvironment")) {
      arr.push({ id: "quietEnvironment", label: "Quiet Environment" });
    }
    if (amenities.includes("powerSocket")) {
      arr.push({ id: "powerSocket", label: "Power Socket" });
    }
    return arr;
  }

  return (
    <div className="relative w-full ios-safe-screen flex flex-col overflow-hidden">
      <Navbar />

      {/* Map container flexes to fill leftover vertical space */}
      <div className="flex-grow relative overflow-hidden">
        <GoogleMap
          mapContainerClassName="absolute inset-0 w-full h-full"
          center={center}
          zoom={12}
          onLoad={onLoad}
          options={{
            styles: grayscaleStyle, // Grayscale only on the map
            clickableIcons: false,
            // Disable all default UI
            disableDefaultUI: true,
          }}
        >
          {/* Firestore-based markers */}
          {filteredLocations.map((loc) => (
            <Marker
              key={loc.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              onClick={() => setSelectedLocation(loc)}
              title={loc.name || "Remote Work Location"}
              icon={MARKER_ICON}
            />
          ))}

          {/* InfoWindow for selected marker */}
          {selectedLocation && (
            <InfoWindow
              position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              onCloseClick={() => setSelectedLocation(null)}
              options={{
                disableAutoPan: false,
                pixelOffset: new google.maps.Size(0, -20),
              }}
            >
              <div style={{ margin: 0, padding: 0 }}>
                <GoogleMapPinCard
                  name={selectedLocation.name || "No Name"}
                  photos={selectedLocation.images || []}
                  amenities={getAmenityArray(selectedLocation.amenities)}
                  onDirectionAction={() => {
                    const lat = selectedLocation.lat;
                    const lng = selectedLocation.lng;
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                      "_blank"
                    );
                  }}
                />
              </div>
            </InfoWindow>
          )}

          {/* User marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={USER_MARKER_ICON}
              title="Your current location"
            />
          )}
        </GoogleMap>

        {/* Search and Filters Overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-3xl px-4">
          <div className="relative bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-xl shadow-xl p-4">
            {/* Search */}
            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <MapPin className="h-5 w-5 text-gray-500" />
              </div>
              <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search for a location"
                  className="w-full pl-12 pr-24 h-14 text-lg rounded-lg border-0 shadow-lg"
                />
              </Autocomplete>
              <Button
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white"
                onClick={() => inputRef.current?.focus()}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>

            {/* FILTERS */}
            {isMobileOrTablet ? (
              /* Icons (mobile/tablet) */
              <div className="flex flex-wrap gap-4 justify-center p-2 rounded-lg">
                {amenityIcons.map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key as keyof AmenityFilters)}
                    className={`text-2xl px-3 py-2 rounded-full ${
                      filters[key as keyof AmenityFilters]
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700"
                    }`}
                    title={key}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            ) : (
              /* Checkboxes (desktop) */
              <div className="flex flex-wrap gap-6 bg-white/20 dark:bg-gray-700/20 backdrop-blur-lg p-4 rounded-lg">
                {Object.keys(amenityLabelToValue).map((label) => {
                  const key =
                    amenityLabelToValue[label as keyof typeof amenityLabelToValue];
                  return (
                    <div key={label} className="flex items-center space-x-2">
                      <Checkbox
                        id={label.toLowerCase().replace(" ", "-")}
                        checked={filters[key]}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(label, Boolean(checked))
                        }
                      />
                      <label
                        htmlFor={label.toLowerCase().replace(" ", "-")}
                        className="text-sm font-medium leading-none"
                      >
                        {label}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Crosshair + Zoom (desktop only) */}
        <div className="absolute top-4 right-4 z-[9999] flex flex-col items-center">
          {/* Crosshair always visible */}
          <div className="mb-[10px]">
            <CrosshairButton
              onLocateAction={(lat, lng) => {
                if (map) {
                  map.setCenter({ lat, lng });
                  setUserLocation({ lat, lng });
                  // Only zoom +3 the FIRST time crosshair is clicked
                  if (!hasCrosshairZoomed) {
                    const currentZoom = map.getZoom() || 12;
                    map.setZoom(currentZoom + 3);
                    setHasCrosshairZoomed(true);
                  }
                }
              }}
            />
          </div>

          {/* Custom Zoom Buttons for desktop only */}
          {!isMobileOrTablet && (
            <div className="flex flex-col items-center bg-white shadow-md rounded-md overflow-hidden">
              <button
                className="px-3 py-2 text-xl font-bold border-b border-gray-200 hover:bg-gray-100"
                onClick={zoomIn}
              >
                +
              </button>
              <button
                className="px-3 py-2 text-xl font-bold hover:bg-gray-100"
                onClick={zoomOut}
              >
                –
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

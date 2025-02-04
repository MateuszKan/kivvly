// app/dashboard/HeroSection.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import { GoogleMapPinCard } from "@/components/google-map-pin-card";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import CrosshairButton from "@/components/CrosshairButton";

const Loading = <div />; // Placeholder for the loadingElement prop

// Grayscale styles for the map
const grayscaleStyle: google.maps.MapTypeStyle[] = [
  // … (tu wstaw swoje style mapy)
];

const defaultCenter = { lat: 40.7128, lng: -74.006 };

interface AmenityFilters {
  toilets: boolean;
  wifi: boolean;
  quietEnvironment: boolean;
  powerSocket: boolean;
}

const amenityLabelToValue = {
  "Power Outlets": "powerSocket",
  "Quiet Environment": "quietEnvironment",
  "Wi-Fi": "wifi",
  Toilets: "toilets",
};

const amenityIcons = [
  { key: "toilets", icon: "🚽" },
  { key: "wifi", icon: "📶" },
  { key: "quietEnvironment", icon: "🤫" },
  { key: "powerSocket", icon: "🔌" },
];

interface remoteWorkLocation {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  status?: string;
  images?: string[];
  amenities?: string[];
}

export default function HeroSection() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  const [userMarkerIcon, setUserMarkerIcon] = useState<any>(null);

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [allLocations, setAllLocations] = useState<remoteWorkLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<remoteWorkLocation[]>([]);

  const [filters, setFilters] = useState<AmenityFilters>({
    toilets: false,
    wifi: false,
    quietEnvironment: false,
    powerSocket: false,
  });

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [hasCrosshairZoomed, setHasCrosshairZoomed] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<remoteWorkLocation | null>(null);

  // Device detection – traktujemy szerokość poniżej 900px jako mobile/tablet
  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 900);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pobranie lokalizacji użytkownika na podstawie IP
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

  // Pobranie lokalizacji z Firestore
  useEffect(() => {
    const fetchLocations = async () => {
      const querySnapshot = await getDocs(collection(db, "remoteWorkLocations"));
      const fetched: remoteWorkLocation[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<remoteWorkLocation, "id">;
        if (data.status === "approved") {
          fetched.push({ id: docSnap.id, ...data });
        }
      });
      setAllLocations(fetched);
      setFilteredLocations(fetched);
    };
    fetchLocations();
  }, []);

  // Filtrowanie lokalizacji na podstawie udogodnień
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

  const toggleFilter = (amenityKey: keyof AmenityFilters) => {
    setFilters((prev) => ({ ...prev, [amenityKey]: !prev[amenityKey] }));
  };

  const handleCheckboxChange = (amenityLabel: string, checked: boolean) => {
    const amenityKey =
      amenityLabelToValue[amenityLabel as keyof typeof amenityLabelToValue];
    setFilters((prev) => ({ ...prev, [amenityKey]: checked }));
  };

  // Inicjalizacja mapy i markerów
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    if (typeof google !== "undefined") {
      setMarkerIcon({
        url: "/marker.svg",
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40),
      });
      setUserMarkerIcon({
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
      });
    }
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

  // Jeśli lokalizacja użytkownika (center) nie została jeszcze pobrana,
  // wyświetlamy skeleton (spinner)
  if (!center) {
    return (
      <div className="w-full flex items-center justify-center h-[100dvh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  function getAmenityArray(amenities: string[] | undefined) {
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

  // Klasy pozycjonujące kontrolki mapy zależnie od typu urządzenia
  const crosshairContainerClasses = isMobileOrTablet
    ? "absolute right-4 top-[80px] z-[1] flex flex-col items-center"
    : "absolute bottom-8 right-4 z-[1] flex flex-col items-center";

  return (
    <div className="relative w-full h-[100dvh] flex flex-col overflow-hidden">
      {/* Kontener mapy */}
      <div className="flex-grow relative overflow-hidden">
        <GoogleMap
          mapContainerClassName="absolute inset-0 w-full h-full"
          center={center}
          zoom={12}
          onLoad={onLoad}
          options={{
            styles: grayscaleStyle,
            clickableIcons: false,
            disableDefaultUI: true,
          }}
        >
          {filteredLocations.map((loc) => (
            <Marker
              key={loc.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              onClick={() => setSelectedLocation(loc)}
              title={loc.name || "Remote Work Location"}
              icon={markerIcon || undefined}
            />
          ))}

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
                    const { lat, lng } = selectedLocation;
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                      "_blank"
                    );
                  }}
                />
              </div>
            </InfoWindow>
          )}

          {userLocation && (
            <Marker
              position={userLocation}
              icon={userMarkerIcon || undefined}
              title="Your current location"
            />
          )}
        </GoogleMap>


        {/* Nakładka wyszukiwania oraz filtrów */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-3xl px-4">
          <div className="relative bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-xl shadow-xl p-4">
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

            {isMobileOrTablet ? (
              <div className="flex flex-wrap gap-4 justify-center p-2 rounded-lg">
                {amenityIcons.map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key as keyof AmenityFilters)}
                    className={`text-2xl px-3 py-2 rounded-full ${
                      filters[key as keyof AmenityFilters]
                        ? "bg-blue-600 text-white"
                        : "text-gray-700"
                    }`}
                    title={key}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center p-4 rounded-lg">
                {Object.keys(amenityLabelToValue).map((label) => {
                  const amenityKey =
                    amenityLabelToValue[label as keyof typeof amenityLabelToValue];
                  return (
                    <div key={label} className="flex bg-transparent items-center space-x-2">
                      <Checkbox
                        id={label.toLowerCase().replace(" ", "-")}
                        checked={filters[amenityKey as keyof AmenityFilters]}
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

        {/* Kontrolki Crosshair oraz Zoom */}
        <div className={crosshairContainerClasses}>
          <div className="mb-[40px]">
            <CrosshairButton
              onLocateAction={(lat, lng) => {
                if (map) {
                  map.setCenter({ lat, lng });
                  setUserLocation({ lat, lng });
                  if (!hasCrosshairZoomed) {
                    const currentZoom = map.getZoom() || 12;
                    map.setZoom(currentZoom + 3);
                    setHasCrosshairZoomed(true);
                  }
                }
              }}
            />
          </div>
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

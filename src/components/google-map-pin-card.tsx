"use client";

import { useState } from "react";
import Image from "next/image";
import { Navigation2, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Typ wyświetlanych udogodnień
interface Amenity {
  id: string;    // np. "toilets"
  label: string; // np. "Toalety"
}

// Przykładowe ikony dla poszczególnych udogodnień
const amenityIcons: Record<string, React.ReactNode> = {
  toilets: <span className="text-lg">🚽</span>,
  wifi: <span className="text-lg">📶</span>,
  quietEnvironment: <span className="text-lg">🤫</span>,
  powerSocket: <span className="text-lg">🔌</span>,
};

interface GoogleMapPinCardProps {
  name: string;
  photos: string[];
  amenities: Amenity[];
  onDirectionAction: () => void;
}

export function GoogleMapPinCard({
  name,
  photos,
  amenities,
  onDirectionAction,
}: GoogleMapPinCardProps) {
  // Stan do obsługi indeksu aktualnego zdjęcia
  const [currentIndex, setCurrentIndex] = useState(0);

  // Funkcja przewijania do następnego zdjęcia
  const handleNext = () => {
    if (!photos || photos.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  // Funkcja przewijania do poprzedniego zdjęcia
  const handlePrev = () => {
    if (!photos || photos.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Bezpiecznik, gdyby tablica zdjęć była pusta
  const hasPhotos = photos && photos.length > 0;
  const currentPhoto = hasPhotos ? photos[currentIndex] : "/placeholder.svg";

  return (
    <div className=" max-w-80 bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Sekcja na zdjęcie z przyciskami przewijania */}
      <div className="relative w-full h-40">
        {/* Główne zdjęcie */}
        <div className="relative w-full h-full">
          <Image
            src={currentPhoto}
            alt={`${name} photo`}
            fill
            className="object-cover"
          />
        </div>

        {/* Przyciski nawigacji (poprzednie/następne) - wyświetlaj tylko jeśli jest więcej niż 1 zdjęcie */}
        {hasPhotos && photos.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-800 bg-opacity-60 text-white hover:bg-opacity-80"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-800 bg-opacity-60 text-white hover:bg-opacity-80"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <div className="p-4">
        {/* Nazwa obiektu */}
        <h2 className="text-xl mb-2 font-semibold">{name}</h2>

        {/* Lista udogodnień */}
        <div className="flex flex-wrap gap-2">
          {amenities.map((amenity, index) => (
            <div
              key={index}
              className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm"
            >
              {/* Ikona jeśli istnieje w słowniku */}
              {amenityIcons[amenity.id] ?? <span>•</span>}
              <span className="ml-1">{amenity.label}</span>
            </div>
          ))}
        </div>

        {/* Przycisk do wyznaczania trasy */}
        <div className="mt-4">
          <Button className="w-full" onClick={onDirectionAction}>
            <Navigation2 className="mr-2 h-4 w-4" />
            Get Directions
          </Button>
        </div>
      </div>
    </div>
  );
}

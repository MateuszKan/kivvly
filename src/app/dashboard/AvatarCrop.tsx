"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";

interface AvatarCropProps {
  imageSrc: string;
  onCropCompleteAction: (croppedBlob: Blob) => void;
}

export function AvatarCrop({ imageSrc, onCropCompleteAction }: AvatarCropProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  // Aktualizacja pikseli przycięcia podczas zmiany obszaru
  const handleCropCompleteInternal = useCallback(
    (croppedArea: any, croppedAreaPixels: { width: number; height: number; x: number; y: number }) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // Generacja przyciętego obrazu przy użyciu canvas
  const generateCroppedImage = async () => {
    if (!croppedAreaPixels) return null;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      return croppedBlob;
    } catch (error) {
      console.error("Error cropping image", error);
      return null;
    }
  };

  // Po zatwierdzeniu przycinania generujemy blob i przekazujemy go do rodzica
  const handleConfirmCrop = async () => {
    const blob = await generateCroppedImage();
    if (blob) {
      onCropCompleteAction(blob);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded shadow-md">
      <div className="relative w-64 h-64 bg-gray-200 rounded-lg">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropCompleteInternal}
        />
      </div>
      <Button onClick={handleConfirmCrop}>Confirm Crop</Button>
    </div>
  );
}

// Funkcja pomocnicza – przycinanie obrazu przy użyciu canvas
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { width: number; height: number; x: number; y: number }
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Cannot get canvas context");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, "image/png");
  });
}

// Pomocnicza funkcja ładująca obraz
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Zapobiega problemom z cross-origin
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

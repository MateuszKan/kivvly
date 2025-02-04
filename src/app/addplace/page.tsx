"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadPlaceImage } from "@/lib/uploadPlaceImage";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import imageCompression from "browser-image-compression";
import { Autocomplete } from "@react-google-maps/api";

// ---- UI Components ----
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ---- Toast Notifications ----
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

import Image from "next/image";

import { useFirebaseUser } from "@/context/FirebaseAuthContext";

// ----- Amenities array -----
const amenities = [
  { id: "toilets", label: "Toilets" },
  { id: "wifi", label: "WiFi" },
  { id: "quietEnvironment", label: "Quiet Environment" },
  { id: "powerSocket", label: "Power Socket" },
];

// ----- Zod schema for form validation -----
const formSchema = z.object({
  locationName: z.string().min(2, {
    message: "Location name must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Please enter a valid location.",
  }),
  amenities: z.array(z.string()).optional(),
});

export default function AddPlacePage() {
  const router = useRouter();
  const { user, loading } = useFirebaseUser();
  const { toast } = useToast();

  // ----- Local states for Google Autocomplete lat/lng & address -----
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // ----- Refs for Google Autocomplete -----
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // ----- Images (up to 3) -----
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // ----- React Hook Form -----
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      locationName: "",
      location: "",
      amenities: [],
    },
  });

  // ----- Google Autocomplete handlers -----
  function onLoad(autocomplete: google.maps.places.Autocomplete) {
    autocompleteRef.current = autocomplete;
  }

  function handlePlaceChanged() {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();

    if (place?.geometry?.location) {
      setLatitude(place.geometry.location.lat().toString());
      setLongitude(place.geometry.location.lng().toString());

      // Zapisujemy adres z Google Autocomplete do pola `location`
      form.setValue("location", place.formatted_address || "");
    }
  }

  // ----- Handle file input (up to 3 images) -----
  const hiddenFileInput = useRef<HTMLInputElement | null>(null);

  const handleChooseFileClick = () => {
    if (selectedImages.length >= 3) {
      toast({
        title: "Limit reached",
        description: "You can only add up to 3 images.",
        variant: "destructive",
      });
      return;
    }
    hiddenFileInput.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFile = fileList[0];

    if (selectedImages.length < 3 && newFile) {
      setSelectedImages((prev) => [...prev, newFile]);

      const newPreview = URL.createObjectURL(newFile);
      setImagePreviews((prev) => [...prev, newPreview]);
    }

    e.target.value = "";
  };

  // ----- Submission logic -----
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (loading) {
      toast({
        title: "Loading",
        description: "Please wait...",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Unauthorized",
        description: "You must be logged in to add a place.",
        variant: "destructive",
      });
      router.replace("/login?reason=unauthorized");
      return;
    }

    if (selectedImages.length === 0) {
      toast({
        title: "No images uploaded",
        description: "Please upload at least one image.",
        variant: "destructive",
      });
      return;
    }

    // 1) Upload images
    const imageUrls: string[] = [];
    if (selectedImages.length > 0) {
      toast({
        title: "Uploading images...",
      });

      try {
        for (const file of selectedImages) {
          // Kompresja
          const compressed = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
          });
          // Upload do Firebase Storage
          const url = await uploadPlaceImage(user.uid, compressed);
          imageUrls.push(url);
        }
      } catch (error) {
        console.error("Error uploading images:", error);
        toast({
          title: "Error uploading images",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // 2) Add the new place to Firestore
    try {
      await addDoc(collection(db, "remoteWorkLocations"), {
        userId: user.uid,
        name: values.locationName,
        // Zapisujemy zarówno adres (jako wartości z pola location),
        // jak i współrzędne lat, lng.
        address: values.location,
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        amenities: values.amenities,
        status: "pending",
        images: imageUrls,
      });

      toast({
        title: "Place added successfully!",
        description: "Please wait for approval.",
      });

      // Reset form
      form.reset();
      setSelectedImages([]);
      setImagePreviews([]);
      setLatitude("");
      setLongitude("");

      router.replace("/");
    } catch (error) {
      console.error("Error adding place:", error);
      toast({
        title: "Error adding place",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ----- Redirect unauthenticated users -----
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Unauthorized",
        description: "You must be logged in to add a place.",
        variant: "destructive",
      });
      router.replace("/login?reason=unauthorized");
    }
  }, [user, loading, router, toast]);

  console.log("AddPlacePage - User:", user, "Loading:", loading);

  // Jeśli dane są w trakcie ładowania lub użytkownik nie jest zalogowany, wyświetl spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  // Jeśli użytkownik nie jest zalogowany, nie renderuj komponentu
  if (!user) {
    return null; // Przekierowanie jest obsługiwane w useEffect
  }

  return (
    <>
      <div className="container mx-auto py-8 mt-[100px]">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Add a New Place</CardTitle>
            <CardDescription>
              Fill in the details to add a new place to our database.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Location Name */}
                <FormField
                  control={form.control}
                  name="locationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter location name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Google Autocomplete */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search or type a location</FormLabel>
                      <Autocomplete onLoad={onLoad} onPlaceChanged={handlePlaceChanged}>
                        <FormControl>
                          <Input placeholder="Enter location" {...field} />
                        </FormControl>
                      </Autocomplete>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload (up to 3) */}
                <div>
                  <FormLabel>Images (up to 3)</FormLabel>
                  <div className="flex items-center gap-2 mt-2">
                    <Button type="button" onClick={handleChooseFileClick}>
                      Choose File
                    </Button>
                    <p className="text-sm text-gray-500">
                      {selectedImages.length} / 3
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={hiddenFileInput}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  {/* Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="flex space-x-2 mt-2">
                      {imagePreviews.map((url, index) => (
                        <Image
                          key={index}
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                          width={80}
                          height={80}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Amenities */}
                <FormField
                  control={form.control}
                  name="amenities"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">Amenities</FormLabel>
                      <div className="flex flex-col gap-3 mt-2">
                        {amenities.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="amenities"
                            render={({ field }) => {
                              const checked = field.value?.includes(item.id);
                              return (
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(checkedValue) => {
                                        if (checkedValue) {
                                          field.onChange([
                                            ...(field.value ?? []),
                                            item.id,
                                          ]);
                                        } else {
                                          field.onChange(
                                            (field.value ?? []).filter(
                                              (val: string) => val !== item.id
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {item.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit button */}
                <Button type="submit">Add Place</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Toaster (powiadomienia) */}
      <Toaster />
    </>
  );
}

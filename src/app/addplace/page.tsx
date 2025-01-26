"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadPlaceImage } from "@/lib/uploadPlaceImage";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import imageCompression from "browser-image-compression";
import { Autocomplete } from "@react-google-maps/api";

// ---- Import your Navbar (adjust path as needed) ----
import Navbar from "@/components/navbar";

// ---- UI Components (adjust paths as needed) ----
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

// ---- Import the toast and Toaster from your `useToast` hook ----
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

import Image from "next/image";

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
  // We store amenities as an array of string IDs.
  amenities: z.array(z.string()).optional(),
});

export default function AddPlacePage() {
  const router = useRouter();

  // Access our toast function from the custom hook
  const { toast } = useToast();

  // ----- Track current user -----
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // If user is not logged in, redirect
  useEffect(() => {
    if (!currentUser) {
      toast({
        title: "Unauthorized",
        description: "You must be logged in to add a place.",
        variant: "destructive",
      });
      router.push("/login?reason=unauthorized");
    }
  }, [currentUser, router, toast]);

  // ----- Local states for Google Autocomplete lat/lng -----
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

    // Only take the first file from this selection
    const newFile = fileList[0];

    if (selectedImages.length < 3 && newFile) {
      setSelectedImages((prev) => [...prev, newFile]);

      // Preview this new file
      const newPreview = URL.createObjectURL(newFile);
      setImagePreviews((prev) => [...prev, newPreview]);
    }

    // Reset the input so we can re-select if needed
    e.target.value = "";
  };

  // ----- Submission logic -----
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) {
      toast({
        title: "Unauthorized",
        description: "You must be logged in to add a place.",
        variant: "destructive",
      });
      return;
    }

    // At least one image should be selected
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
          const compressed = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
          });
          const url = await uploadPlaceImage(currentUser.uid, compressed);
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
        userId: currentUser.uid,
        name: values.locationName,
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

      router.push("/");
    } catch (error) {
      console.error("Error adding place:", error);
      toast({
        title: "Error adding place",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // If there's no user, return null or a loading indicator
  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Navbar />

      <div className="container mx-auto py-8">
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

      <Image
        src="/path/to/image.jpg"
        alt="Descriptive alt"
        width={300}
        height={200}
      />

      {/* IMPORTANT: The Toaster component must be rendered for toasts to appear */}
      <Toaster />
    </>
  );
}

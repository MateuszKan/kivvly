"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import NextImage from "next/image"; // import Next's Image
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

// ---------- CUSTOM AVATAR IMAGE USING NEXT <Image> -----------
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
    sizes?: string; // optional if you want to override sizes from the parent
  }
>(({ className, sizes, ...props }, ref) => (
  // Use "asChild" so Radix will render NEXT's <Image> instead of a plain <img>
  <AvatarPrimitive.Image asChild>
    <NextImage
      ref={ref}
      fill
      // Example sizes: adjust as needed for your layout
      sizes={
        sizes ||
        "(max-width: 768px) 40px," +
        "(max-width: 1200px) 48px," +
        "56px"
      }
      className={cn("object-cover", className)}
      // Because we're using "asChild", we pass along the other props
      {...props}
    />
  </AvatarPrimitive.Image>
));
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };

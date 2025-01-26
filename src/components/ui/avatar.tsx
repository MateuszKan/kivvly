// avatar.tsx

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import NextImage, { ImageProps as NextImageProps } from "next/image"
import { cn } from "@/lib/utils"

// 1) Avatar Root
// --------------------------------------------------
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
))
Avatar.displayName = AvatarPrimitive.Root.displayName

// 2) Avatar Image using Next.js <Image>
// --------------------------------------------------
// We'll define a custom prop type that *requires* src and alt
// and merges them with Radix's props and Next.js's ImageProps.
type AvatarImageProps = Omit<
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>,
  "asChild" | "src" | "alt"
> &
  Omit<NextImageProps, "src" | "alt" | "sizes"> & {
    /** Provide the image source. Must be a string or StaticImport. */
    src: string
    /** Provide an alt for accessibility. Required by Next.js <Image>. */
    alt: string
    /** Optionally override the default "sizes" string. */
    sizes?: string
  }

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ src, alt, sizes, className, ...props }, ref) => (
  <AvatarPrimitive.Image asChild ref={ref} {...props}>
    <NextImage
      // Next.js <Image> required props:
      src={src}
      alt={alt}
      fill
      // Provide a default sizes pattern, or accept an override:
      sizes={
        sizes ||
        "(max-width: 768px) 40px," +
        "(max-width: 1200px) 48px," +
        "56px"
      }
      className={cn("object-cover", className)}
      // Spread other Next.js Image props as needed (e.g., priority, onLoadingComplete, etc.)
    />
  </AvatarPrimitive.Image>
))
AvatarImage.displayName = "AvatarImage"

// 3) Avatar Fallback
// --------------------------------------------------
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
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// 4) Exports
// --------------------------------------------------
export { Avatar, AvatarImage, AvatarFallback }

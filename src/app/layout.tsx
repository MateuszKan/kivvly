// app/layout.tsx (Next.js 13+)
import "./globals.css"
import GoogleMapsProvider from "@/components/GoogleMapsProvider"
import { AuthProvider } from "@/context/FirebaseAuthContext"
// Import the Toaster from your UI components
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GoogleMapsProvider>
            {children}
            {/* Mount the Toaster here so all client components can use toast() */}
            <Toaster />
          </GoogleMapsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

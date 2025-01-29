import "./globals.css"
import GoogleMapsProvider from "@/components/GoogleMapsProvider"
import { AuthProvider } from "@/context/FirebaseAuthContext"
// Import the Toaster from your UI components
import { Toaster } from "@/components/ui/toaster"
import Navbar from "@/components/navbar"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
        <Navbar/>
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

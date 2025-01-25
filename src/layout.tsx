// app/layout.tsx (Next.js 13+)
import "./globals.css";
import GoogleMapsProvider from "@/components/GoogleMapsProvider";
import { AuthProvider } from "@/context/FirebaseAuthContext";

// --- Important: import the Toaster ---
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GoogleMapsProvider>
            <div className="mx-auto max-w-[1410px] w-full">
              {children}
            </div>

            {/* Render the Toaster at the bottom of the body */}
            <Toaster />
          </GoogleMapsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

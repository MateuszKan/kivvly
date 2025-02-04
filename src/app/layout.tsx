// app/layout.tsx
import Metadata from "next";
import "./globals.css";

// Because this file is a Server Component, do NOT use "use client" here

import { Quicksand, Montserrat, Roboto, Lora } from "next/font/google";
import { AuthProvider } from "@/context/FirebaseAuthContext";
import Navbar from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import GoogleMapsProvider from "@/components/GoogleMapsProvider";

// Import your separate "MainClient" component
import MainClient from "./MainClient";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-quicksand",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-montserrat",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-roboto",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "Kivvly Workspaces",
  description: "Find the best remote work locations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${montserrat.variable} ${roboto.variable} ${lora.variable}`}
    >
      <body>
        <AuthProvider>
          <GoogleMapsProvider>
            <Navbar />
            {/*
              Use our Client Component to wrap children.
              This lets you do anything client-side in `MainClient.tsx`.
            */}
            <MainClient>{children}</MainClient>

            <Toaster />
          </GoogleMapsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import { LoadScript } from "@react-google-maps/api";
import HeroSection from "@/components/hero-section";

export default function MyMapPage() {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      loadingElement={
        <div className="w-full h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <HeroSection />
    </LoadScript>
  );
}

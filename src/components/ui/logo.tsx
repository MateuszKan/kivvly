"use client"; // Ensure this is a client-side component

import Image from "next/image";
import Link from "next/link";

const Logo = () => {
  return (
    <Link href="/" className="flex items-center">
      {/* Desktop Logo: Visible on medium screens and above */}
      <div className="hidden md:block">
        <Image
          src="/kivvly.svg" // Replace with your desktop logo path
          alt="Desktop Logo"
          width={150}
          height={50}
          className="h-10 w-auto"
        />
      </div>

      {/* Mobile/Tablet Logo: Visible on small screens */}
      <div className="block md:hidden">
        <Image
          src="/kivvly-mobile.svg" // Replace with your mobile/tablet logo path
          alt="Mobile Logo"
          width={100}
          height={40}
          className="h-8 w-auto"
        />
      </div>
    </Link>
  );
};

export default Logo;

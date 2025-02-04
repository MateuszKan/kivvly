// app/MainClient.tsx
"use client";
import React from "react";

/**
 * This is a Client Component.
 * You can use state, effects, or any client-side logic here.
 */
export default function MainClient({ children }: { children: React.ReactNode }) {
  // You can run hooks, state, etc.
  // e.g. const [count, setCount] = useState(0);

  return <main>{children}</main>;
}

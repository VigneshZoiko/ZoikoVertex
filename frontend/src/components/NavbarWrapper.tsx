"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/signin",
  "/reset-password",
  "/auth/update-password",
  "/privacy",
  "/terms",
  "/docs",
];

export default function NavbarWrapper() {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isPublicRoute) return null;

  return <Navbar />;
}

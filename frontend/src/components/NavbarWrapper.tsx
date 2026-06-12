"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

const AUTH_LAYOUT_ROUTES = [
  "/login",
  "/signup",
  "/signin",
  "/reset-password",
  "/auth/update-password",
];

const PUBLIC_ROUTES = [
  ...AUTH_LAYOUT_ROUTES,
  "/privacy",
  "/terms",
  "/docs",
];

export default function NavbarWrapper() {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const usesAuthLayout = AUTH_LAYOUT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isPublicRoute) return null;
  if (usesAuthLayout) return null;

  return <Navbar />;
}

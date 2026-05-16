"use client";

import { ThemeProvider } from "next-themes";
import { RoleProvider } from "@/lib/context/RoleContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="dark" 
      enableSystem={false}
      disableTransitionOnChange
    >
      <RoleProvider>
        {children}
      </RoleProvider>
    </ThemeProvider>
  );
}

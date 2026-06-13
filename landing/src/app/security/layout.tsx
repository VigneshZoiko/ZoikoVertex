import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://www.zoikovertex.com/security",
  },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

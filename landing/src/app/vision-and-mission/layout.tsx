import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZoikoVertex Vision & Mission | Governed AI Marketing",
  description:
    "Discover ZoikoVertex vision and mission for governed AI marketing, combining smart automation, human oversight, and responsible AI strategies for growth.",
};

export default function VisionAndMissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

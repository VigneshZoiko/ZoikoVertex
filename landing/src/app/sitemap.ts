import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.zoikovertex.com";
  return [
    { url: `${base}/`,           lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/security`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/privacy`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/governance`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}

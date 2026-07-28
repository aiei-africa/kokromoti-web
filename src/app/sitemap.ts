import type { MetadataRoute } from "next";

// Homepage only, honestly — Kokromoti is currently one client-rendered
// route (navPanel/electionType/electionYear/selectedConstituency all live
// as React state + query params, not real Next.js server routes), so
// there's nothing else to list yet. This is the same limitation flagged
// during the AdSense/SEO conversation: real per-constituency and
// per-candidate pages (the roadmap's Election Archive) would each become
// a genuinely separate, indexable entry here — that's the actual
// high-leverage next step for organic search, not just this file.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://app.aiei-africa.org/",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];
}

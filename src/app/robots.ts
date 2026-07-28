import type { MetadataRoute } from "next";

// Same file-convention pattern already used for opengraph-image.tsx —
// Next.js auto-serves this at /robots.txt with the correct content-type,
// no static file or server config needed. Root cause of zero Google
// indexing for app.aiei-africa.org: this file never existed, so the URL
// simply 404'd — nothing was ever explicitly blocking crawlers, but
// nothing was explicitly inviting them either, and Search Console was
// never verified/submitted on top of that.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://app.aiei-africa.org/sitemap.xml",
  };
}

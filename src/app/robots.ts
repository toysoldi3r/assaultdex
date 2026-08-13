import type { MetadataRoute } from "next";

// Disallow crawling/scraping of every route. AssaultDex is a fan tool over
// derived data; we don't want bots harvesting the dex/usage pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}

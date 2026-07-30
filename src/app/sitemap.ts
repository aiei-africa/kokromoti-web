import type { MetadataRoute } from 'next';
import { fetchElections, fetchPresidentialByConstituency, slugify } from '@/lib/seo-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const elections = await fetchElections();

  const entries: MetadataRoute.Sitemap = [
    { url: 'https://app.aiei-africa.org', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ];

  for (const election of elections) {
    const rows = await fetchPresidentialByConstituency(election.code);
    for (const row of rows) {
      entries.push({
        url: `https://app.aiei-africa.org/results/${election.code}/${slugify(row.constituency.name)}-${row.constituency.ecCode.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }
  return entries;
}

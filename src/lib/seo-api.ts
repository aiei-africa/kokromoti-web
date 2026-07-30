const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export type Election = {
  id: string;
  code: string;   // e.g. "1992", "2000R", "2024", "2028"
  name: string;
  year: number;
  round: number;
  status: 'HISTORICAL' | 'UPCOMING' | string;
};

export type CandidateResult = {
  candidate: { fullName: string; photoUrl?: string | null; party: { abbreviation: string; colourHex: string | null } };
  votes: number;
  votePct: number;
};

export type ConstituencyResultRow = {
  constituency: { id: string; name: string; ecCode: string };
  status: string;
  totalCast: number | null;
  turnoutPct: number | null;
  results: CandidateResult[];
};

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// slug is `${slugify(name)}-${ecCode}` — ecCode has no hyphens, so it's
// always safe to recover by splitting on the last '-'.
export function ecCodeFromSlug(slug: string): string {
  return slug.slice(slug.lastIndexOf('-') + 1).toUpperCase();
}

export async function fetchElections(): Promise<Election[]> {
  const res = await fetch(`${API_BASE}/elections`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPresidentialByConstituency(electionCode: string): Promise<ConstituencyResultRow[]> {
  const res = await fetch(`${API_BASE}/results/presidential/${electionCode}/by-constituency`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchParliamentaryByConstituency(electionCode: string): Promise<ConstituencyResultRow[]> {
  const res = await fetch(`${API_BASE}/results/parliamentary/${electionCode}`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  return res.json();
}

// Lightweight lookup for screens that select a constituency without
// already having its ecCode in hand (currently: the map / RegionsPanel
// path, which only carries GeoJSON feature id/name/region).
export async function fetchConstituencyEcCodeMap(): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/geography/constituencies`, { next: { revalidate: 3600 } });
  if (!res.ok) return {};
  const list: { id: string; ecCode: string }[] = await res.json();
  return Object.fromEntries(list.map((c) => [c.id, c.ecCode]));
}

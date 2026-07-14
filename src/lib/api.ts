// Single fetch wrapper for kokromoti-api. Base URL comes from an env var
// so local dev (localhost:3001) and production (Railway) never need code
// changes — only .env.local / Vercel/Railway env vars differ.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Election {
  id: string; code: string; name: string; year: number; round: number;
  parliamentLabel: string | null; status: string; rounds: { code: string }[];
}
export interface Region {
  id: string; name: string; shortName: string; capital: string;
  _count: { constituencies: number; districts: number };
}
export interface CandidateResult {
  candidate?: { id?: string; fullName: string; party: { abbreviation: string; colourHex: string | null } | null };
  fullName?: string; party?: { abbreviation: string; colourHex: string | null } | null;
  votes: number; votePct: number;
}
export interface PresidentialNational {
  election: string; totalValidVotes: number; results: CandidateResult[];
}
export interface ParliamentarySummary {
  election: string; totalSeats: number; declaredSeats: number; undeclaredSeats: number;
  independentSeats: number; majorityThreshold: number; hasMajority: boolean;
  leadingParty: { abbreviation: string; colourHex: string | null; seats: number } | null;
  parties: { abbreviation: string; colourHex: string | null; seats: number }[];
}
export interface RegionResults {
  region: { id: string; name: string; shortName: string };
  election: string; electionType: string; constituenciesReporting: number;
  registeredVoters: number; totalCast: number; validVotes: number; rejectedBallots: number;
  turnoutPct: number | null;
  results: CandidateResult[];
  byConstituency: { constituency: string; winner: { fullName: string; party?: string } | null; turnoutPct: string | number | null }[];
}
// Bulk per-constituency breakdown — used by the Results tab, region-grouped
// client-side (constituency doesn't come with its region here; that's
// joined in from a separate /geography/constituencies fetch).
export interface ConstituencySeatResult {
  constituency: { id: string; name: string; ecCode: string };
  status: string; totalCast: number | null; turnoutPct: number | null;
  results: CandidateResult[];
}
export interface ConstituencyFullResult {
  id: string; status: string;
  registeredVoters: number | null; totalCast: number | null; validVotes: number | null;
  rejectedBallots: number | null; turnoutPct: number | null;
  constituency: { name: string; ecCode: string };
  votes: CandidateResult[];
}
export interface FavouritesResponse {
  constituencies: { id: string; name: string; ecCode: string; region: { shortName: string } }[];
  regions: { id: string; name: string; shortName: string }[];
  parties: { id: string; name: string; abbreviation: string; colourHex: string | null }[];
  favouritedAt: Record<string, string>;
}
export interface ConstituencyGeo {
  id: string; name: string; ecCode: string; region: { shortName: string };
  _count?: { pollingStations: number; pollingStationArchive: number };
}
export interface ArchiveStation {
  code: string; name: string; eaCode: string | null; registeredVoters: number | null;
}
export interface ConstituencyHistory {
  constituency: string; electionType: string;
  history: {
    electionCode: string; year: number; provisional: boolean;
    winner: { fullName: string; party: string | null; colourHex: string | null; votes: number; votePct: number } | null;
    candidates: { fullName: string; party: string | null; colourHex: string | null; votes: number; votePct: number }[];
    registeredVoters: number | null; totalCast: number | null; validVotes: number | null;
    rejectedBallots: number | null; turnoutPct: number | null; margin: number | null;
    source: string | null; status: string | null; stationsReporting: number | null;
    stationsTotal: number | null; declaredAt: string | null; notes: string | null;
  }[];
  trend: {
    NDC: { colourHex: string | null; points: { year: number; electionCode: string; votePct: number; provisional: boolean }[] };
    NPP: { colourHex: string | null; points: { year: number; electionCode: string; votePct: number; provisional: boolean }[] };
    Others: { colourHex: string | null; points: { year: number; electionCode: string; votePct: number; provisional: boolean }[] };
  };
  tally: { party: string; wins: number }[];
  electionsWithData: number;
  isSwingSeat: boolean;
}

export const api = {
  mapConstituencyBoundaries: () => apiFetch<any>("/map-dashboard/constituency-boundaries"),
  mapTrend: (queryString: string) => apiFetch<any>(`/map-dashboard/trend?${queryString}`),
  mapRegions: () => apiFetch<any[]>("/map-dashboard/regions"),
  elections: () => apiFetch<Election[]>("/elections"),
  election: (code: string) => apiFetch<Election>(`/elections/${code}`),
  regions: () => apiFetch<Region[]>("/geography/regions"),
  regionResults: (regionId: string, electionCode: string, type: "PRESIDENTIAL" | "PARLIAMENTARY") =>
    apiFetch<RegionResults>(`/geography/regions/${regionId}/results/${electionCode}?type=${type}`),
  constituenciesGeo: () => apiFetch<ConstituencyGeo[]>("/geography/constituencies"),
  presidentialNational: (electionCode: string) =>
    apiFetch<PresidentialNational>(`/results/presidential/${electionCode}`),
  presidentialByConstituency: (electionCode: string) =>
    apiFetch<ConstituencySeatResult[]>(`/results/presidential/${electionCode}/by-constituency`),
  presidentialConstituency: (electionCode: string, constituencyId: string) =>
    apiFetch<ConstituencyFullResult>(`/results/presidential/${electionCode}/${constituencyId}`),
  parliamentarySummary: (electionCode: string) =>
    apiFetch<ParliamentarySummary>(`/results/parliamentary/${electionCode}/summary`),
  parliamentaryAllSeats: (electionCode: string) =>
    apiFetch<ConstituencySeatResult[]>(`/results/parliamentary/${electionCode}`),
  parliamentaryConstituency: (electionCode: string, constituencyId: string) =>
    apiFetch<ConstituencyFullResult>(`/results/parliamentary/${electionCode}/${constituencyId}`),
  constituencies: (regionShortName?: string) =>
    apiFetch(`/geography/constituencies${regionShortName ? `?region=${regionShortName}` : ""}`),
  constituency: (id: string) => apiFetch(`/geography/constituencies/${id}`),
  stationsArchive: (constituencyId: string) =>
    apiFetch<ArchiveStation[]>(`/geography/constituencies/${constituencyId}/stations-archive`),
  stationsCurrent: (constituencyId: string) =>
    apiFetch<ArchiveStation[]>(`/geography/constituencies/${constituencyId}/stations-current`),
  constituencyHistory: (constituencyId: string, type: "PRESIDENTIAL" | "PARLIAMENTARY") =>
    apiFetch<ConstituencyHistory>(`/results/history/${constituencyId}?type=${type}`),

  register: (data: { email: string; password: string; fullName: string; phone?: string }) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  favourites: (token: string) => apiFetch<FavouritesResponse>("/favourites", { headers: { Authorization: `Bearer ${token}` } }),
  addFavourite: (token: string, entityType: string, entityId: string) =>
    apiFetch("/favourites", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ entityType, entityId }) }),
  removeFavourite: (token: string, entityType: string, entityId: string) =>
    apiFetch(`/favourites/${entityType}/${entityId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
};

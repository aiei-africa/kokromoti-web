import type { CandidateResult } from "./api";

// Each election TYPE tracks its own current year independently — they don't
// have to match. Presidential and parliamentary data get seeded on their
// own separate timelines, so the app must be able to show 2024 presidential
// results alongside 2020 parliamentary results at the same time, each on
// its own tab. Bump each constant independently as more years get seeded.
export const CURRENT_PRESIDENTIAL_ELECTION_CODE = "2024";
export const CURRENT_PARLIAMENTARY_ELECTION_CODE = "2024";

export function currentElectionCodeFor(electionType: "presidential" | "parliamentary"): string {
  return electionType === "presidential" ? CURRENT_PRESIDENTIAL_ELECTION_CODE : CURRENT_PARLIAMENTARY_ELECTION_CODE;
}

// Full span of Ghana's 4th Republic elections. 1992 is included as a real,
// selectable year — per standing instruction, what the EC has for 1992 is
// genuine EC data, not provisional; the first election under the 4th
// Republic simply had less detailed collation capacity. Existing panels'
// own empty-state handling ("No results available for {code} yet.")
// already covers any real data gaps for a given year/type without needing
// a special case here. 2028 is listed but has no Election row yet — see
// isElectionYearActive.
// Newest-first, left to right — this is the SELECTOR order only (tabs).
// The trend chart's own x-axis stays chronological (oldest -> newest,
// left -> right) since that's how a time series should read; it uses its
// own separate YEARS/allYears arrays in MapExplorer.tsx, untouched by this.
export const ALL_ELECTION_CODES = ["2028", "2024", "2020", "2016", "2012", "2008", "2004", "2000", "1996", "1992"];

export function isElectionYearActive(code: string): boolean {
  return code !== "2028";
}

// Real historical races have anywhere from 2 to 8 candidates. The Results
// list view shows only the two leading candidates, genuinely data-driven —
// sorted by vote share, take the top two, whoever they actually are. This
// is NOT a hardcoded NDC/NPP assumption (v10's own prototype had that
// hardcode, but only because its simulated data was two-candidate-only to
// begin with — real data needs the general case).
export function pickTopTwo(results: CandidateResult[]): CandidateResult[] {
  return [...results].sort((a, b) => b.votePct - a.votePct).slice(0, 2);
}

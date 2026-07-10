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

// Real historical races have anywhere from 2 to 8 candidates. The Results
// list view shows only the two leading candidates, genuinely data-driven —
// sorted by vote share, take the top two, whoever they actually are. This
// is NOT a hardcoded NDC/NPP assumption (v10's own prototype had that
// hardcode, but only because its simulated data was two-candidate-only to
// begin with — real data needs the general case).
export function pickTopTwo(results: CandidateResult[]): CandidateResult[] {
  return [...results].sort((a, b) => b.votePct - a.votePct).slice(0, 2);
}

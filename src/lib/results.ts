import type { CandidateResult } from "./api";

// The single election this build of the app currently represents. Results
// tab (and, for now, Ghana/Regions too) always shows THIS election only —
// no year selector. Bump this one constant when 2024 is brought up to the
// same validated standard as 1996-2016; 2028 is a distinct later phase
// (live per-constituency aggregation as results come in, not a fixed code).
export const CURRENT_ELECTION_CODE = "2016";

// Real historical races have anywhere from 2 to 8 candidates. The Results
// list view shows only the two leading candidates, genuinely data-driven —
// sorted by vote share, take the top two, whoever they actually are. This
// is NOT a hardcoded NDC/NPP assumption (v10's own prototype had that
// hardcode, but only because its simulated data was two-candidate-only to
// begin with — real data needs the general case).
export function pickTopTwo(results: CandidateResult[]): CandidateResult[] {
  return [...results].sort((a, b) => b.votePct - a.votePct).slice(0, 2);
}

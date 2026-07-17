"use client";
import { ALL_ELECTION_CODES, isElectionYearActive } from "@/lib/results";

// Shared year-tab strip for Results/Regions/Ghana — one global selection,
// not three independent pickers, so the whole app stays showing "the same
// year" everywhere at once. Renders 1992 through 2028. 1992 is included
// (per standing instruction: it's real EC data, not provisional — the EC
// simply lacked the capacity for detailed collation that first election
// under the 4th Republic, which is a data-completeness fact, not a
// legitimacy flag). 2028 renders but is disabled ("Coming soon…") since it
// has no Election row yet — this list is intentionally NOT dynamically
// fetched from the backend; it's the fixed, known span of Ghana's 4th
// Republic elections, same as TRACKED_ELECTIONS on the API side.
export default function ElectionYearTabs({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <div className="ey-tabs">
      {ALL_ELECTION_CODES.map((code) => {
        const active = isElectionYearActive(code);
        const selected = code === value;
        return (
          <button
            key={code}
            type="button"
            className={`ey-tab${selected ? " active" : ""}${!active ? " disabled" : ""}`}
            onClick={() => active && onChange(code)}
            disabled={!active}
            title={active ? undefined : "2028 — Coming soon"}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}

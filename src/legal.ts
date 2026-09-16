import termsMd from "./legal/terms.md?raw";
import privacyMd from "./legal/privacy.md?raw";
import pilotMd from "./legal/pilot-agreement.md?raw";
import endCustomerNoticeMd from "./legal/end-customer-notice.md?raw";
import qkitScheduleMd from "./legal/schedules/qkit.md?raw";
import loopkitScheduleMd from "./legal/schedules/loopkit.md?raw";
import paykitScheduleMd from "./legal/schedules/paykit.md?raw";
import stockkitScheduleMd from "./legal/schedules/stockkit.md?raw";
import printkitScheduleMd from "./legal/schedules/printkit.md?raw";

export { LEGAL_VERSIONS } from "./legal/version";
export type { LegalDocType } from "./legal/version";
import { LEGAL_VERSIONS } from "./legal/version";
import type { LegalDocType } from "./legal/version";

const SCHEDULE_ORDER: [string, string][] = [
  ["qkit", qkitScheduleMd],
  ["loopkit", loopkitScheduleMd],
  ["paykit", paykitScheduleMd],
  ["stockkit", stockkitScheduleMd],
  ["printkit", printkitScheduleMd],
];

/** Strips a schedule's own leading H1 (its `## {slug} schedule` divider
 *  already serves as its heading) and demotes every remaining heading by
 *  one level, so a schedule's clauses nest under its divider instead of
 *  reading as siblings of the base document's own top-level clauses. */
function demoteScheduleHeadings(content: string): string {
  const lines = content.split("\n");
  const h1Index = lines.findIndex((line) => /^#\s+/.test(line));
  if (h1Index !== -1) lines.splice(h1Index, 1);
  return lines
    .map((line) => (/^#{1,5}\s/.test(line) ? `#${line}` : line))
    .join("\n")
    .trim();
}

/** `kitSlug` given: only that kit's own schedule is appended (what a vendor
 *  actually reads on that kit's /legal/terms page). `kitSlug` omitted: every
 *  kit's schedule is appended (merqo hub's own page — a hub vendor isn't
 *  tied to one kit, so the full annex is the right read there). */
function withSchedules(base: string, kitSlug?: string): string {
  const entries = kitSlug
    ? SCHEDULE_ORDER.filter(([slug]) => slug === kitSlug)
    : SCHEDULE_ORDER;
  const heading = kitSlug ? "## Annex: Schedule" : "## Annex: Per-Kit Schedules";
  const annex = entries
    .map(([slug, content]) => `## ${slug} schedule\n\n${demoteScheduleHeadings(content)}`)
    .join("\n\n");
  return `${base}\n\n${heading}\n\n${annex}`;
}

/** Raw markdown for a document. `"terms"` is pre-composed with the relevant
 *  per-kit schedule(s) appended, per `withSchedules` above — kits hash this
 *  string server-side before calling POST /api/merqo/legal-accept, so the
 *  hash covers exactly what's shown. */
export function getLegalDocSource(doc: LegalDocType, kitSlug?: string): string {
  if (doc === "terms") return withSchedules(termsMd, kitSlug);
  if (doc === "privacy") return privacyMd;
  return pilotMd;
}

export function getEndCustomerNoticeSource(): string {
  return endCustomerNoticeMd;
}

/** Pure version comparison — ISO date strings sort lexically. `pilot`
 *  deliberately excluded: the public acceptance gate only ever requires
 *  terms + privacy; the pilot agreement is accepted through its own signed
 *  flow, not this gate. */
export function isLegalCurrent(
  accepted: { terms?: string | null; privacy?: string | null },
  required: typeof LEGAL_VERSIONS = LEGAL_VERSIONS,
): boolean {
  if (!accepted.terms || !accepted.privacy) return false;
  return accepted.terms >= required.terms && accepted.privacy >= required.privacy;
}

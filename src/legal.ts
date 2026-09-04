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

function withSchedules(base: string): string {
  const annex = SCHEDULE_ORDER.map(
    ([slug, content]) => `## ${slug} schedule\n\n${content}`,
  ).join("\n\n");
  return `${base}\n\n## Annex: Per-Kit Schedules\n\n${annex}`;
}

/** Raw markdown for a document. `"terms"` is pre-composed with every
 *  per-kit schedule appended — kits hash this string server-side before
 *  calling POST /api/merqo/legal-accept, so the hash covers what's shown. */
export function getLegalDocSource(doc: LegalDocType): string {
  if (doc === "terms") return withSchedules(termsMd);
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

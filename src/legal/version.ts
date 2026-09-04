/** Bump the relevant date (YYYY-MM-DD) whenever a document's content
 *  changes. A version bump to merqo-ui must roll out to merqo + every kit
 *  the same day — see the plan's Global Constraints (version-skew finding). */
export const LEGAL_VERSIONS = {
  terms: "2026-09-04",
  privacy: "2026-09-04",
  pilot: "2026-09-04",
} as const;

export type LegalDocType = keyof typeof LEGAL_VERSIONS;

# merqo-ui/src/legal/CHANGELOG.md

## 2026-09-16
Two fixes, founder-requested:

- **Per-kit schedule scoping.** `getLegalDocSource("terms", kitSlug)` now
  takes an optional kit slug; when given, only that kit's own Annex
  schedule is appended, not all 5. Previously every kit's `/legal/terms`
  page called `getLegalDocSource("terms")` with no kit context, so a qkit
  vendor read loopkit's, paykit's, printkit's, and stockkit's schedules
  too, alongside their own. `LegalDocument` gained a matching optional
  `kit` prop. merqo hub's own `/legal/terms` page is unchanged (still no
  `kit` prop, still the full multi-schedule annex) — a hub vendor isn't
  tied to one kit. Each kit's `terms/page.tsx` now passes its own slug
  (`kit="qkit"` etc.), and each kit's `accept/actions.ts` now hashes
  `getLegalDocSource(docType, "<kit>")` so the recorded `doc_sha256`
  matches what that kit's vendor actually saw.
- **Contracting-party name.** "Lee Jia Hao Clarence" replaced with
  "Clarence Lee" in terms.md, privacy.md, pilot-agreement.md, and
  about-merqo.tsx. Founder decision; ACRA registration (pending) will
  carry the full legal name and UEN regardless once it completes.

terms.md and privacy.md bumped to version 2026-09-16 (both changed:
per-kit schedule scoping changes terms.md's composed output, and the name
swap touches both). pilot-agreement.md also bumped since its hash changed
from the name swap, though no clause's substance moved.
version-manifest.json's 2026-09-16 entry is LF-normalized (matches CI,
not this Windows checkout's CRLF working tree) — same known local-only
`legal-version-guard.test.ts` failure mode as 2026-09-07 below.

## 2026-09-07
Pre-lawyer-review sweep: removed every em dash from terms.md, privacy.md,
pilot-agreement.md, end-customer-notice.md, and all 5 per-kit schedules,
replacing each with the punctuation a legal register actually uses
(comma, semicolon, colon, parentheses, or a full stop splitting the
sentence). Also fixed two substantive issues found in the same pass:

- privacy.md's Your rights and Audit and security logs sections used
  GDPR-only framing (a blanket "right to deletion", and a "legitimate
  interest" label for the audit-log correction/erasure exemption) that
  the PDPA does not actually grant or use. Reframed around the PDPA's
  real rights (access, correction, consent withdrawal) and what actually
  follows from a withdrawal (we stop processing, then delete/anonymise
  once nothing else requires the data), without naming a foreign legal
  basis.
- terms.md had no general "as is" / no-warranty disclaimer for the
  standard (non-pilot) Service, and no clause reserving Merqo's own IP in
  the Service itself, despite the Pilot Agreement having its own "Service
  as-is" section. Added Our intellectual property and Service
  availability sections so paying vendors get the same baseline
  protection pilot vendors already had.

terms.md and privacy.md bumped to version 2026-09-07 (content changed);
pilot-agreement.md's punctuation-only cleanup also bumped since its hash
changed, though no clause's substance moved. version-manifest.json's
2026-09-07 entry was generated from LF-normalized content to match what
CI (Linux) hashes, not the CRLF this repo's own Windows checkout produces
locally — see legal-version-guard.test.ts's known local-only failure mode.

## 2026-09-06 (same-day founder-name fill)
terms.md, privacy.md, pilot-agreement.md: filled the contracting-party
placeholder with the founder's real legal name (Lee Jia Hao Clarence),
replacing the unfilled `[Founder's full legal name]` bracket. Party is
still described as "trading as Merqo (sole proprietorship — ACRA
registration pending)" — registration status unchanged. No real vendor
had accepted any prior version at the time of this fix.

## 2026-09-06
privacy.md: removed in-line draft/founder-confirm language from Where your
data is stored (states the Singapore hosting region as fact, no hedging),
and filled the Contact and DPO placeholder with legal@merqo.io, matching
terms.md's existing notices address.
terms.md: added a precedence carve-out to the entire-agreement clause in
General terms so a Pilot/UAT Agreement in effect prevails over these Terms
for the Pilot Kits and Pilot Term it covers.
legal.ts: fixed `withSchedules` to strip each schedule's own H1 and demote
its remaining headings by one level, so a composed `/legal/terms` page no
longer has duplicate/unstyled H1s or schedule clauses reading as siblings
of the base ToS's own clauses. legal-document.tsx: added an `h1` renderer
so the base ToS/Privacy/Pilot documents' own top-level titles render
styled with a slugified anchor id.

## 2026-09-04
Initial publication: Terms of Service, Privacy Policy, Pilot/UAT Agreement,
per-kit schedules (qkit, loopkit, paykit, stockkit, printkit), end-customer
notice.

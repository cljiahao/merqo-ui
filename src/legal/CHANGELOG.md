# merqo-ui/src/legal/CHANGELOG.md

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

"use client";

import * as React from "react";
import { DashboardTour, type TourStep } from "./dashboard-tour";

export interface TourDefinition {
  /** Stable id for this tour — keys its "seen" state and React remount. */
  id: string;
  /** Path prefix this tour applies to (e.g. "/dashboard/booths"). Matched
   *  against `pathname` exactly or as a "/"-bounded prefix, so a nested
   *  route like "/dashboard/booths/abc123" still resolves to this tour. */
  route: string;
  /** Same contract as `DashboardTour`'s own `steps` prop. */
  steps: TourStep[] | (() => TourStep[]);
}

export interface DashboardToursProps {
  tours: TourDefinition[];
  /** The caller's current pathname (this package has no router dependency). */
  pathname: string;
  /** Ids of tours this user has already completed. */
  seenTourIds: string[];
  /** Fires once, immediately, when an unseen tour auto-starts. See
   *  `DashboardTour`'s own `onFirstSeen` doc comment for the full contract. */
  onFirstSeen: (tourId: string) => Promise<void>;
  scopeClassName?: string;
}

// A route with only one path segment (e.g. "/dashboard") is a section's own
// root, not a feature area — sibling pages nested one level under it (e.g.
// "/dashboard/stats") are NOT its children, they just share the same parent
// segment for routing convenience. Only a route with 2+ segments (e.g.
// "/dashboard/booths") names a specific-enough feature area to legitimately
// own nested pages via prefix (e.g. "/dashboard/booths/abc123"). Without this
// guard, a 1-segment route would prefix-match every sibling page under it.
function matchesRoute(pathname: string, route: string): boolean {
  if (pathname === route) return true;
  const segmentCount = route.split("/").filter(Boolean).length;
  return segmentCount >= 2 && pathname.startsWith(`${route}/`);
}

/**
 * Route-matched router over `DashboardTour`, for kits with more than one
 * dashboard page tour. Picks the tour whose `route` most specifically
 * matches the current pathname (longest match wins) and mounts only that
 * one — so replaying always plays the CURRENT page's tour, never a
 * different page's, and pages with no matching tour render nothing.
 *
 * Each kit still owns its own step content, routing, and "seen" persistence
 * (a list of completed tour ids) exactly as `DashboardTour` already does for
 * a single tour — this component only adds the route-to-tour lookup so kits
 * don't each reimplement it.
 */
export function DashboardTours({
  tours,
  pathname,
  seenTourIds,
  onFirstSeen,
  scopeClassName,
}: DashboardToursProps) {
  const active = React.useMemo(
    () =>
      tours
        .filter((tour) => matchesRoute(pathname, tour.route))
        .sort((a, b) => b.route.length - a.route.length)[0],
    [tours, pathname],
  );

  if (!active) return null;

  return (
    <DashboardTour
      // Forces a full remount on tour switch — DashboardTour latches `seen`
      // in a ref at mount time, so reusing one instance across tours would
      // keep serving the FIRST tour's `seen` value forever.
      key={active.id}
      steps={active.steps}
      seen={seenTourIds.includes(active.id)}
      onFirstSeen={() => onFirstSeen(active.id)}
      // Always true by construction: `active` is already the tour matching
      // the current route, so there's never a cross-page replay to resume.
      isHomeRoute
      navigateHome={() => {}}
      scopeClassName={scopeClassName}
    />
  );
}

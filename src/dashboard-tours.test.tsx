import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardTours, type TourDefinition } from "./dashboard-tours";
import type { DashboardTourProps } from "./dashboard-tour";

// DashboardTour's own driver.js/lifecycle behavior is fully covered by
// dashboard-tour.test.tsx — this stub only lets us assert what DashboardTours
// passes down (which tour, which seen value, which onFirstSeen closure).
vi.mock("./dashboard-tour", () => ({
  DashboardTour: vi.fn((props: DashboardTourProps) => (
    <div
      data-testid="stub-tour"
      data-seen={String(props.seen)}
      data-is-home-route={String(props.isHomeRoute)}
      data-scope={props.scopeClassName}
    >
      {typeof props.steps === "function" ? props.steps()[0]?.title : props.steps[0]?.title}
    </div>
  )),
}));

const ORDERS: TourDefinition = {
  id: "orders",
  route: "/dashboard",
  steps: [{ element: "[data-tour=a]", title: "Orders step", description: "d" }],
};
const BOOTHS: TourDefinition = {
  id: "booths",
  route: "/dashboard/booths",
  steps: [{ element: "[data-tour=b]", title: "Booths step", description: "d" }],
};

describe("DashboardTours — route matching", () => {
  it("renders nothing when no tour's route matches the current pathname", () => {
    render(
      <DashboardTours
        tours={[ORDERS, BOOTHS]}
        pathname="/dashboard/stats"
        seenTourIds={[]}
        onFirstSeen={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("stub-tour")).not.toBeInTheDocument();
  });

  it("matches a tour whose route exactly equals the pathname", () => {
    render(
      <DashboardTours
        tours={[ORDERS, BOOTHS]}
        pathname="/dashboard"
        seenTourIds={[]}
        onFirstSeen={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stub-tour")).toHaveTextContent("Orders step");
  });

  it("prefers the more specific (longer) route match over a broader prefix", () => {
    render(
      <DashboardTours
        tours={[ORDERS, BOOTHS]}
        pathname="/dashboard/booths"
        seenTourIds={[]}
        onFirstSeen={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stub-tour")).toHaveTextContent("Booths step");
  });

  it("matches a nested route under a tour's route (e.g. a booth detail page)", () => {
    render(
      <DashboardTours
        tours={[ORDERS, BOOTHS]}
        pathname="/dashboard/booths/abc123"
        seenTourIds={[]}
        onFirstSeen={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stub-tour")).toHaveTextContent("Booths step");
  });

  it("does not treat a route as a prefix match of an unrelated sibling with a shared string prefix", () => {
    const boothsLike: TourDefinition = {
      id: "boothsLike",
      route: "/dashboard/booths-archive",
      steps: [{ element: "[data-tour=c]", title: "Archive step", description: "d" }],
    };
    render(
      <DashboardTours
        tours={[BOOTHS, boothsLike]}
        pathname="/dashboard/booths"
        seenTourIds={[]}
        onFirstSeen={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stub-tour")).toHaveTextContent("Booths step");
  });
});

describe("DashboardTours — props passthrough", () => {
  it("passes seen=true only when the matched tour's id is in seenTourIds", () => {
    render(
      <DashboardTours
        tours={[ORDERS, BOOTHS]}
        pathname="/dashboard/booths"
        seenTourIds={["orders"]}
        onFirstSeen={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stub-tour")).toHaveAttribute("data-seen", "false");
  });

  it("passes seen=true when the matched tour's id is in seenTourIds", () => {
    render(
      <DashboardTours
        tours={[ORDERS, BOOTHS]}
        pathname="/dashboard/booths"
        seenTourIds={["booths"]}
        onFirstSeen={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stub-tour")).toHaveAttribute("data-seen", "true");
  });

  it("always passes isHomeRoute=true — the matched tour always belongs to the current route", () => {
    render(
      <DashboardTours
        tours={[ORDERS, BOOTHS]}
        pathname="/dashboard/booths"
        seenTourIds={[]}
        onFirstSeen={vi.fn()}
      />,
    );
    expect(screen.getByTestId("stub-tour")).toHaveAttribute(
      "data-is-home-route",
      "true",
    );
  });

  it("forwards scopeClassName to the matched tour", () => {
    render(
      <DashboardTours
        tours={[ORDERS]}
        pathname="/dashboard"
        seenTourIds={[]}
        onFirstSeen={vi.fn()}
        scopeClassName="qkit-tour"
      />,
    );
    expect(screen.getByTestId("stub-tour")).toHaveAttribute(
      "data-scope",
      "qkit-tour",
    );
  });

  it("calls onFirstSeen with the matched tour's own id, not another tour's", async () => {
    const onFirstSeen = vi.fn();
    const { DashboardTour } = await import("./dashboard-tour");
    render(
      <DashboardTours
        tours={[ORDERS, BOOTHS]}
        pathname="/dashboard/booths"
        seenTourIds={[]}
        onFirstSeen={onFirstSeen}
      />,
    );
    const props = (DashboardTour as unknown as ReturnType<typeof vi.fn>).mock
      .calls.at(-1)?.[0] as DashboardTourProps;
    await props.onFirstSeen();
    expect(onFirstSeen).toHaveBeenCalledWith("booths");
  });
});

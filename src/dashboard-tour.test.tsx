import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { DashboardTour, type DashboardTourProps } from "./dashboard-tour";

const STEPS = [
  { element: "[data-tour=a]", title: "Step A", description: "First step" },
  { element: "[data-tour=b]", title: "Step B", description: "Second step" },
];

function baseProps(
  overrides: Partial<DashboardTourProps> = {},
): DashboardTourProps {
  return {
    steps: STEPS,
    seen: false,
    onFirstSeen: vi.fn().mockResolvedValue(undefined),
    isHomeRoute: true,
    navigateHome: vi.fn(),
    scopeClassName: "test-tour",
    ...overrides,
  };
}

beforeEach(() => {
  document.head.innerHTML = "";
});

describe("DashboardTour — button contract", () => {
  it("renders the replay button even when isHomeRoute is false", () => {
    render(<DashboardTour {...baseProps({ isHomeRoute: false, seen: true })} />);
    expect(
      screen.getByRole("button", { name: "Replay onboarding tour" }),
    ).toBeInTheDocument();
  });

  it("renders the button with the exact data-tour attribute, aria-label, and icon classes the kits expect", () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    const button = screen.getByRole("button", { name: "Replay onboarding tour" });
    expect(button).toHaveAttribute("data-tour", "tour-replay");
    const icon = button.querySelector("svg");
    expect(icon).toHaveClass("h-6", "w-6");
  });
});

describe("DashboardTour — onFirstSeen contract", () => {
  it("does not call onFirstSeen just from mounting when seen is already true", async () => {
    const onFirstSeen = vi.fn().mockResolvedValue(undefined);
    render(<DashboardTour {...baseProps({ seen: true, onFirstSeen })} />);
    await screen.findByRole("button", { name: "Replay onboarding tour" });
    expect(onFirstSeen).not.toHaveBeenCalled();
  });

  it("fires onFirstSeen exactly once, immediately when an unseen auto-start begins — before driver.js has even finished loading, not from destroy/completion", async () => {
    let resolveImport: (mod: unknown) => void = () => {};
    const importPromise = new Promise((resolve) => {
      resolveImport = resolve;
    });
    vi.doMock("driver.js", () => importPromise);
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    const onFirstSeen = vi.fn().mockResolvedValue(undefined);
    render(
      <FreshDashboardTour
        {...baseProps({ seen: false, onFirstSeen })}
      />,
    );

    // onFirstSeen must already have fired even though the lazy driver.js
    // import is still pending — proves it's tied to tour-start, not to
    // driver.js's onDestroyed/completion.
    await waitFor(() => expect(onFirstSeen).toHaveBeenCalledTimes(1));

    resolveImport({
      driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onFirstSeen).toHaveBeenCalledTimes(1);

    vi.doUnmock("driver.js");
  });

  it("clicking replay never calls onFirstSeen for a user who has already seen the tour", async () => {
    const onFirstSeen = vi.fn().mockResolvedValue(undefined);
    render(<DashboardTour {...baseProps({ seen: true, onFirstSeen })} />);
    const button = await screen.findByRole("button", {
      name: "Replay onboarding tour",
    });
    await act(async () => {
      button.click();
    });
    expect(onFirstSeen).not.toHaveBeenCalled();
  });

  it("clicking replay never calls onFirstSeen for an unseen user replaying from another page", async () => {
    const onFirstSeen = vi.fn().mockResolvedValue(undefined);
    const navigateHome = vi.fn();
    const { rerender } = render(
      <DashboardTour
        {...baseProps({
          seen: false,
          isHomeRoute: false,
          onFirstSeen,
          navigateHome,
        })}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Replay onboarding tour",
    });
    await act(async () => {
      button.click();
    });
    expect(navigateHome).toHaveBeenCalledTimes(1);
    expect(onFirstSeen).not.toHaveBeenCalled();

    // Simulate the caller's navigation having landed on the home route —
    // the pending replay resumes, still never touching onFirstSeen.
    rerender(
      <DashboardTour
        {...baseProps({
          seen: false,
          isHomeRoute: true,
          onFirstSeen,
          navigateHome,
        })}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onFirstSeen).not.toHaveBeenCalled();
  });
});

describe("DashboardTour — cross-page replay", () => {
  it("clicking replay off the home route navigates home and does not start driver.js, then starts once isHomeRoute flips true", async () => {
    const drive = vi.fn();
    const driverSpy = vi.fn(() => ({ drive, destroy: vi.fn() }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    const navigateHome = vi.fn();
    const { rerender } = render(
      <FreshDashboardTour
        {...baseProps({ seen: true, isHomeRoute: false, navigateHome })}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Replay onboarding tour",
    });
    await act(async () => {
      button.click();
    });

    expect(navigateHome).toHaveBeenCalledTimes(1);
    expect(driverSpy).not.toHaveBeenCalled();

    rerender(
      <FreshDashboardTour
        {...baseProps({ seen: true, isHomeRoute: true, navigateHome })}
      />,
    );
    await waitFor(() => expect(drive).toHaveBeenCalledTimes(1));

    vi.doUnmock("driver.js");
  });

  it("clicking replay on the home route starts the tour directly, without navigating", async () => {
    const drive = vi.fn();
    vi.doMock("driver.js", () => ({
      driver: vi.fn(() => ({ drive, destroy: vi.fn() })),
    }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    const navigateHome = vi.fn();
    render(
      <FreshDashboardTour
        {...baseProps({ seen: true, isHomeRoute: true, navigateHome })}
      />,
    );
    const button = await screen.findByRole("button", {
      name: "Replay onboarding tour",
    });
    await act(async () => {
      button.click();
    });

    await waitFor(() => expect(drive).toHaveBeenCalledTimes(1));
    expect(navigateHome).not.toHaveBeenCalled();

    vi.doUnmock("driver.js");
  });
});

describe("DashboardTour — re-entrancy and unmount races", () => {
  it("clicking replay again while a tour is already live destroys the previous instance before starting a new one — no leaked instance", async () => {
    // Proves the ground-truth #7 re-entrancy contract: `driverRef.current
    // ?.destroy()` at the TOP of start(), before building the next
    // instance. We drive this via two back-to-back (but sequenced) clicks
    // rather than two literally-same-tick clicks: Vitest's SSR module
    // mocker doesn't correctly dedupe two truly-concurrent (unresolved)
    // dynamic import("driver.js") calls issued from a non-test-file module
    // — the second one falls through to the REAL package instead of the
    // mock (confirmed via isolated repro; real browsers don't have this
    // bug, since concurrent import() of the same specifier is natively
    // deduped to one Promise). Sequencing the clicks exercises the exact
    // same destroy-before-build code path without hitting that harness
    // limitation.
    const destroy = vi.fn();
    const driverSpy = vi.fn(() => ({ drive: vi.fn(), destroy }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    render(<FreshDashboardTour {...baseProps({ seen: true, isHomeRoute: true })} />);
    const button = await screen.findByRole("button", {
      name: "Replay onboarding tour",
    });

    await act(async () => {
      button.click();
    });
    await waitFor(() => expect(driverSpy).toHaveBeenCalledTimes(1));
    expect(destroy).not.toHaveBeenCalled();

    await act(async () => {
      button.click();
    });
    await waitFor(() => expect(driverSpy).toHaveBeenCalledTimes(2));

    // Exactly one constructed instance is left un-destroyed — never two
    // live instances leaked.
    expect(destroy).toHaveBeenCalledTimes(driverSpy.mock.calls.length - 1);

    vi.doUnmock("driver.js");
  });

  it("does not construct or drive a driver instance if the component unmounts while the lazy import('driver.js') is still pending", async () => {
    const importCalled = vi.fn();
    let resolveImport: (mod: unknown) => void = () => {};
    const importPromise = new Promise((resolve) => {
      resolveImport = resolve;
    });
    const driverSpy = vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() }));
    vi.doMock("driver.js", () => {
      importCalled();
      return importPromise;
    });
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    const { unmount } = render(
      <FreshDashboardTour {...baseProps({ seen: false, isHomeRoute: true })} />,
    );

    await waitFor(() => expect(importCalled).toHaveBeenCalled());

    unmount();
    resolveImport({ driver: driverSpy });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(driverSpy).not.toHaveBeenCalled();

    vi.doUnmock("driver.js");
  });
});

describe("DashboardTour — steps resolution", () => {
  it("does not call a function-form steps prop just from rendering or from an off-home-route replay click", async () => {
    const stepsSpy = vi.fn(() => STEPS);
    vi.doMock("driver.js", () => ({
      driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })),
    }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    render(
      <FreshDashboardTour
        {...baseProps({ seen: true, isHomeRoute: false, steps: stepsSpy })}
      />,
    );
    expect(stepsSpy).not.toHaveBeenCalled();

    const button = screen.getByRole("button", {
      name: "Replay onboarding tour",
    });
    await act(async () => {
      button.click();
    });
    expect(stepsSpy).not.toHaveBeenCalled();

    vi.doUnmock("driver.js");
  });

  it("resolves a function-form steps prop exactly once, at tour-start time", async () => {
    const stepsSpy = vi.fn(() => STEPS);
    const driverSpy = vi.fn((_config: Record<string, unknown>) => ({
      drive: vi.fn(),
      destroy: vi.fn(),
    }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    render(
      <FreshDashboardTour
        {...baseProps({ seen: true, isHomeRoute: true, steps: stepsSpy })}
      />,
    );
    expect(stepsSpy).not.toHaveBeenCalled();

    const button = screen.getByRole("button", {
      name: "Replay onboarding tour",
    });
    await act(async () => {
      button.click();
    });

    await waitFor(() => expect(stepsSpy).toHaveBeenCalledTimes(1));
    expect(driverSpy.mock.calls[0][0].steps).toEqual([
      {
        element: "[data-tour=a]",
        popover: { title: "Step A", description: "First step" },
      },
      {
        element: "[data-tour=b]",
        popover: { title: "Step B", description: "Second step" },
      },
    ]);

    vi.doUnmock("driver.js");
  });
});

describe("DashboardTour — driver.js config", () => {
  it("passes the exact shared driver.js config when the tour auto-starts on an unseen mount", async () => {
    const driverSpy = vi.fn((_config: Record<string, unknown>) => ({
      drive: vi.fn(),
      destroy: vi.fn(),
    }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    render(<FreshDashboardTour {...baseProps({ seen: false })} />);
    await waitFor(() => expect(driverSpy).toHaveBeenCalledTimes(1));

    const config = driverSpy.mock.calls[0][0];
    expect(config).toMatchObject({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.6,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
    });
    expect(config.steps).toEqual([
      {
        element: "[data-tour=a]",
        popover: { title: "Step A", description: "First step" },
      },
      {
        element: "[data-tour=b]",
        popover: { title: "Step B", description: "Second step" },
      },
    ]);
    expect(config.popoverClass).toContain("test-tour");
    expect(typeof config.onDestroyed).toBe("function");

    vi.doUnmock("driver.js");
  });

  it('uses a generic "tour-popover" base class, not a kit-specific name', async () => {
    const driverSpy = vi.fn((_config: Record<string, unknown>) => ({
      drive: vi.fn(),
      destroy: vi.fn(),
    }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    render(<FreshDashboardTour {...baseProps({ seen: false })} />);
    await waitFor(() => expect(driverSpy).toHaveBeenCalledTimes(1));

    const config = driverSpy.mock.calls[0][0];
    expect(config.popoverClass).toContain("tour-popover");
    expect(config.popoverClass).not.toContain("merqo-tour-popover");

    vi.doUnmock("driver.js");
  });

  it("does not auto-start driver.js for a user who has already seen the tour, but starts it on replay click", async () => {
    const driverSpy = vi.fn((_config: Record<string, unknown>) => ({
      drive: vi.fn(),
      destroy: vi.fn(),
    }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    render(<FreshDashboardTour {...baseProps({ seen: true })} />);
    const button = await screen.findByRole("button", {
      name: "Replay onboarding tour",
    });
    await waitFor(() => expect(driverSpy).not.toHaveBeenCalled());

    await act(async () => {
      button.click();
    });
    await waitFor(() => expect(driverSpy).toHaveBeenCalledTimes(1));

    const config = driverSpy.mock.calls[0][0];
    expect(config).toMatchObject({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.6,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
    });

    vi.doUnmock("driver.js");
  });

  it("destroys the driver instance on unmount, once it has actually started", async () => {
    const destroy = vi.fn();
    const drive = vi.fn();
    vi.doMock("driver.js", () => ({
      driver: vi.fn(() => ({ drive, destroy })),
    }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    const { unmount } = render(
      <FreshDashboardTour {...baseProps({ seen: false })} />,
    );
    await waitFor(() => expect(drive).toHaveBeenCalledTimes(1));

    unmount();
    expect(destroy).toHaveBeenCalledTimes(1);

    vi.doUnmock("driver.js");
  });
});

describe("DashboardTour — injected popover CSS", () => {
  it("injects a <style> element scoped to scopeClassName", () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    const style = document.getElementById("merqo-tour-styles");
    expect(style).toBeInTheDocument();
    expect(style?.textContent).toContain(".test-tour");
  });

  it("uses only CSS custom-property values, never a literal color/font/radius (box-shadow's raw rgb() alpha-black tint is the sole, deliberate exception — there is no cross-kit shadow-color token)", () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    const css = document.getElementById("merqo-tour-styles")?.textContent ?? "";
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\bhsl\(|\boklch\(/);
    expect(css).toContain("var(--popover)");
  });

  it("injects the full popover ruleset (title, description, progress-text, close-btn, prev/next-btn, arrow tints), not just the minimal subset", async () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    const styleEl = document.getElementById("merqo-tour-styles");
    const css = styleEl?.textContent ?? "";
    expect(css).toContain(".driver-popover-title");
    expect(css).toContain(".driver-popover-description");
    expect(css).toContain(".driver-popover-progress-text");
    expect(css).toContain(".driver-popover-close-btn");
    expect(css).toContain(".driver-popover-prev-btn");
    expect(css).toContain(".driver-popover-next-btn");
    expect(css).toContain(".driver-popover-arrow-side-left");
    expect(css).toContain(".driver-popover-arrow-side-right");
    expect(css).toContain(".driver-popover-arrow-side-top");
    expect(css).toContain(".driver-popover-arrow-side-bottom");
  });

  it("does not duplicate the <style> element when mounted twice", () => {
    const { unmount } = render(<DashboardTour {...baseProps({ seen: true })} />);
    unmount();
    render(<DashboardTour {...baseProps({ seen: true, scopeClassName: "other-tour" })} />);
    expect(
      document.querySelectorAll("#merqo-tour-styles"),
    ).toHaveLength(1);
  });

  it("a second mount with a different scopeClassName still gets its own scoped rule available", () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    render(<DashboardTour {...baseProps({ seen: true, scopeClassName: "second-tour" })} />);
    const css = document.getElementById("merqo-tour-styles")?.textContent ?? "";
    expect(css).toContain(".test-tour");
    expect(css).toContain(".second-tour");
  });

  it("does not false-positive its dedup check when scopeClassName is a substring of an internal driver.js class name", () => {
    // Regression test: the old dedup check matched the bare `.${scopeClassName} {`
    // substring, which is also present inside every scope's
    // `.driver-popover-title` rule — a scope literally named
    // "driver-popover-title" would never get its own top-level rule under
    // the old check. Matching the FULL scoped selector fixes this.
    render(<DashboardTour {...baseProps({ seen: true })} />);
    render(
      <DashboardTour
        {...baseProps({ seen: true, scopeClassName: "driver-popover-title" })}
      />,
    );
    const css = document.getElementById("merqo-tour-styles")?.textContent ?? "";
    expect(css).toContain(".driver-popover.driver-popover-title {");
  });
});

describe("DashboardTour — regressions (N1, N2)", () => {
  it("N1: still constructs and drives after React StrictMode's dev-only double-invoke (unmountedRef must reset on remount)", async () => {
    const drive = vi.fn();
    const driverSpy = vi.fn((_config: Record<string, unknown>) => ({
      drive,
      destroy: vi.fn(),
    }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    // StrictMode simulates an immediate dev-only unmount+remount right
    // after the first mount. Without resetting `unmountedRef.current` back
    // to false on the remount, every future start() call's post-await
    // guard stays permanently tripped, and the tour would never
    // construct/drive again for the life of the page.
    render(
      <React.StrictMode>
        <FreshDashboardTour {...baseProps({ seen: false })} />
      </React.StrictMode>,
    );

    await waitFor(() => expect(drive).toHaveBeenCalled());
    expect(drive.mock.calls.length).toBeGreaterThanOrEqual(1);

    vi.doUnmock("driver.js");
  });

  it("N2: a pending cross-page replay still starts the tour when the steps resolver's identity churns across renders", async () => {
    const drive = vi.fn();
    const driverSpy = vi.fn((_config: Record<string, unknown>) => ({
      drive,
      destroy: vi.fn(),
    }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    const navigateHome = vi.fn();
    // A fresh inline steps resolver on every render simulates a consumer
    // using steps={() => STEPS} — the README's own recommended SSR-safe
    // pattern — whose identity churns on every render, and therefore so
    // does `start`'s identity (start depends on [steps, scopeClassName]).
    const { rerender } = render(
      <FreshDashboardTour
        {...baseProps({
          seen: true,
          isHomeRoute: false,
          navigateHome,
          steps: () => STEPS,
        })}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Replay onboarding tour",
    });
    await act(async () => {
      button.click();
    });
    expect(navigateHome).toHaveBeenCalledTimes(1);

    // Two separate re-renders landing isHomeRoute: true, each passing a
    // brand-new steps function identity — simulates two commits settling
    // in the same frame after router.push (pathname update, then RSC
    // payload settling). If the resume effect depended on `start`, the
    // second re-render's identity-only churn would cancel the first
    // render's scheduled rAF and find the pendingReplay flag already
    // spent, silently dropping the replay.
    // Each rerender() call is individually act-wrapped by Testing Library
    // and flushes its own commit's effects synchronously before returning
    // — deliberately NOT nested inside one shared `act()` block, which
    // would let React coalesce both into a single effect pass and never
    // exercise the intermediate (first) commit's effect run at all.
    rerender(
      <FreshDashboardTour
        {...baseProps({
          seen: true,
          isHomeRoute: true,
          navigateHome,
          steps: () => STEPS,
        })}
      />,
    );
    rerender(
      <FreshDashboardTour
        {...baseProps({
          seen: true,
          isHomeRoute: true,
          navigateHome,
          steps: () => STEPS,
        })}
      />,
    );

    await waitFor(() => expect(drive).toHaveBeenCalledTimes(1));

    vi.doUnmock("driver.js");
  });
});

describe("DashboardTour — package entry point", () => {
  it("is exported from the package root", async () => {
    const pkg = await import("./index");
    expect(pkg.DashboardTour).toBe(DashboardTour);
  });
});

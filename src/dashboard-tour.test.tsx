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

  it("uses only CSS custom-property values, never a literal color/font/radius", () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    const css = document.getElementById("merqo-tour-styles")?.textContent ?? "";
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgb\(|\bhsl\(|\boklch\(/);
    expect(css).toContain("var(--popover)");
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

describe("DashboardTour — package entry point", () => {
  it("is exported from the package root", async () => {
    const pkg = await import("./index");
    expect(pkg.DashboardTour).toBe(DashboardTour);
  });
});

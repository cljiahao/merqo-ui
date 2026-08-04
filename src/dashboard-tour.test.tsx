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
    scopeClassName: "test-tour",
    ...overrides,
  };
}

beforeEach(() => {
  document.head.innerHTML = "";
});

describe("DashboardTour — mount behavior", () => {
  it("renders nothing when isHomeRoute is false", () => {
    const { container } = render(
      <DashboardTour {...baseProps({ isHomeRoute: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the floating replay button when isHomeRoute is true", async () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    expect(
      await screen.findByRole("button", { name: /replay tour/i }),
    ).toBeInTheDocument();
  });

  it("does not render the replay button when isHomeRoute is false, even if seen is true", () => {
    render(<DashboardTour {...baseProps({ isHomeRoute: false, seen: true })} />);
    expect(
      screen.queryByRole("button", { name: /replay tour/i }),
    ).not.toBeInTheDocument();
  });
});

describe("DashboardTour — onFirstSeen contract", () => {
  it("does not call onFirstSeen just from mounting when seen is already true", async () => {
    const onFirstSeen = vi.fn().mockResolvedValue(undefined);
    render(<DashboardTour {...baseProps({ seen: true, onFirstSeen })} />);
    await screen.findByRole("button", { name: /replay tour/i });
    expect(onFirstSeen).not.toHaveBeenCalled();
  });

  it("clicking replay never calls onFirstSeen for a user who has already seen the tour", async () => {
    const onFirstSeen = vi.fn().mockResolvedValue(undefined);
    render(<DashboardTour {...baseProps({ seen: true, onFirstSeen })} />);
    const button = await screen.findByRole("button", { name: /replay tour/i });
    await act(async () => {
      button.click();
    });
    expect(onFirstSeen).not.toHaveBeenCalled();
  });
});

describe("DashboardTour — driver.js config", () => {
  it("passes the exact shared driver.js config on every mount", async () => {
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
    const button = await screen.findByRole("button", { name: /replay tour/i });
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

  it("destroys the driver instance on unmount", async () => {
    const destroy = vi.fn();
    vi.doMock("driver.js", () => ({
      driver: vi.fn(() => ({ drive: vi.fn(), destroy })),
    }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    const { unmount } = render(
      <FreshDashboardTour {...baseProps({ seen: false })} />,
    );
    await waitFor(() => expect(destroy).not.toHaveBeenCalled());

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
});

import "@testing-library/jest-dom/vitest";

if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = () => {};
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom doesn't implement real navigation — clicking a genuine <a href> in a
// test (e.g. asserting a nav link's href, then clicking it to check a panel
// closes) logs "Not implemented: navigation" to the virtual console. Tests
// only assert href attributes, never real navigation, so suppress it at the
// source rather than let it print as noise on every such test.
document.addEventListener(
  "click",
  (event) => {
    const anchor = (event.target as HTMLElement | null)?.closest("a[href]");
    if (anchor) {
      event.preventDefault();
    }
  },
  { capture: true },
);

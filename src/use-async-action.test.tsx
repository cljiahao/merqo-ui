import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsyncAction } from "./use-async-action";

describe("useAsyncAction", () => {
  it("starts with pending false", () => {
    const { result } = renderHook(() =>
      useAsyncAction(() => Promise.resolve()),
    );
    expect(result.current.pending).toBe(false);
  });

  it("sets pending true while the action runs, false after it resolves", async () => {
    let resolveAction!: () => void;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const { result } = renderHook(() => useAsyncAction(action));

    let runPromise!: Promise<void>;
    act(() => {
      runPromise = result.current.run();
    });

    expect(result.current.pending).toBe(true);

    await act(async () => {
      resolveAction();
      await runPromise;
    });

    expect(result.current.pending).toBe(false);
  });

  it("resets pending to false even when the action throws", async () => {
    const action = vi.fn(() => Promise.reject(new Error("boom")));
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => {
      await expect(result.current.run()).rejects.toThrow("boom");
    });

    expect(result.current.pending).toBe(false);
  });

  it("forwards arguments to the action", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => {
      await result.current.run("a", 2);
    });

    expect(action).toHaveBeenCalledWith("a", 2);
  });
});

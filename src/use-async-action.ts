"use client";

import * as React from "react";

export function useAsyncAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>,
) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const run = React.useCallback(
    async (...args: Args) => {
      setPending(true);
      setError(null);
      try {
        await action(...args);
      } catch (err) {
        setError(err);
        // Re-thrown so existing caller-level error handling (including
        // `rejects.toThrow` in tests) keeps working unchanged - `error` is
        // an additive field, not a replacement for propagation.
        throw err;
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { pending, error, run };
}

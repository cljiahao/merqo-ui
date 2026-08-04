"use client";

import * as React from "react";

export function useAsyncAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>,
) {
  const [pending, setPending] = React.useState(false);

  const run = React.useCallback(
    async (...args: Args) => {
      setPending(true);
      try {
        await action(...args);
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { pending, run };
}

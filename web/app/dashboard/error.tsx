"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h2 className="text-base font-semibold text-white">Dashboard error</h2>
      <p className="max-w-sm text-xs text-white/60">
        Could not load this view. If you just saved files, wait for the dev server to finish compiling.
      </p>
      <button type="button" className="btn sm" onClick={() => reset()}>
        Reload section
      </button>
    </div>
  );
}

"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-svh bg-[#08090c] text-white antialiased">
        <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-lg font-semibold">ArcFlows</h1>
          <p className="text-sm text-white/60">A critical error occurred. Refresh or try again.</p>
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

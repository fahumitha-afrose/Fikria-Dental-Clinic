"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-md">
        <ErrorState
          title="This page hit a snag"
          description={
            process.env.NODE_ENV === "development"
              ? error.message
              : "Our team has been notified. Please try again, or head back to the homepage."
          }
          onRetry={reset}
        />
      </div>
    </div>
  );
}

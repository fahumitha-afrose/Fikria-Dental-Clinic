import { AlertTriangle, RotateCcw } from "lucide-react";

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again, or contact the clinic directly if the problem continues.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-6 py-10 text-center"
    >
      <AlertTriangle className="mb-3 text-[var(--danger)]" size={28} aria-hidden="true" />
      <p className="font-display text-base">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--card)]"
        >
          <RotateCcw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

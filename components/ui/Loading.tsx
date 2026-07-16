export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Skeleton row matching the shape of an appointment table row. */
export function TableRowSkeleton({ columns = 8 }: { columns?: number }) {
  return (
    <tr className="animate-pulse border-b border-[var(--border)] last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 w-full rounded bg-[var(--border)]" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton card matching the shape of a summary/stat card. */
export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-3 h-4 w-4 rounded bg-[var(--border)]" />
      <div className="mb-2 h-6 w-12 rounded bg-[var(--border)]" />
      <div className="h-3 w-20 rounded bg-[var(--border)]" />
    </div>
  );
}

export function PageLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[var(--muted)]">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

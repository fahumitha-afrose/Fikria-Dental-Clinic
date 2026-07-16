import Link from "next/link";
import { SmileArc } from "@/components/ui/SmileArc";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 text-center text-[var(--foreground)]">
      <p className="font-display text-6xl text-[var(--primary)]">404</p>
      <SmileArc className="my-4" />
      <h1 className="mb-2 text-xl">We couldn&apos;t find that page</h1>
      <p className="mb-6 max-w-sm text-sm text-[var(--muted)]">
        It might have been moved, or the link may be out of date. Our AI receptionist can still help —
        look for the chat bubble in the corner.
      </p>
      <Link
        href="/"
        className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm text-[var(--primary-foreground)] hover:opacity-90"
      >
        Back to homepage
      </Link>
    </div>
  );
}

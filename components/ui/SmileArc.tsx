import { cn } from "@/lib/utils";

/**
 * The platform's signature mark: a thin arcing line — reads as both a smile
 * and a calm pulse line. Used under section eyebrows/headings and as the
 * receptionist launcher glyph. Keep this the one recurring flourish;
 * everything else in the UI stays quiet.
 */
export function SmileArc({ className }: { className?: string }) {
  return (
    <svg
      className={cn("smile-arc", className)}
      viewBox="0 0 64 12"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M2 2 C 18 12, 46 12, 62 2" />
    </svg>
  );
}

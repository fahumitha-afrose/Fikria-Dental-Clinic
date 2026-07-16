"use client";

export function OpenReceptionistButton({
  label,
  message,
  className,
}: {
  label: string;
  message?: string;
  className?: string;
}) {
  return (
    <button
      onClick={() =>
        window.dispatchEvent(new CustomEvent("fikria:open-receptionist", { detail: { message } }))
      }
      className={className}
    >
      {label}
    </button>
  );
}

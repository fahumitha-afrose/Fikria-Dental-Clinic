"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Renders a doctor's photo from public/doctors/, falling back to a clean
 * initials placeholder if the image is missing (images are generated/added
 * separately — see public/doctors/README.md).
 */
export function DoctorAvatar({
  name,
  imagePath,
  size = 96,
  className,
}: {
  name: string;
  imagePath?: string | null;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!imagePath || errored) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-[var(--primary)]/10 font-display text-[var(--primary)]",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.32 }}
        aria-label={name}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <Image
      src={imagePath}
      alt={name}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}

// frontend/src/components/SickBadge.tsx
import React from "react";

type Props = {
  type: "50pct" | "0pct";
  notes?: string | null;
};

export default function SickBadge({ type, notes }: Props) {
  const label = type === "0pct" ? "Incapacidad 0%" : "Incapacidad 50%";
  const cls =
    type === "0pct"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${cls}`}
      title={notes || label}
    >
      {label}
    </span>
  );
}

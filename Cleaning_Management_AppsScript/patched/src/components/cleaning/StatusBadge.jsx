import React from "react";

const MAP = {
  BELUM: { cls: "bg-zinc-900/10 text-zinc-600", label: "Belum" },
  PROGRESS: { cls: "bg-amber-500/15 text-amber-700", label: "Progress" },
  DONE: { cls: "bg-emerald-500/15 text-emerald-700", label: "Done" },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || MAP.BELUM;
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${s.cls} text-sm font-medium px-2.5 py-1 rounded-full border border-current/10`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
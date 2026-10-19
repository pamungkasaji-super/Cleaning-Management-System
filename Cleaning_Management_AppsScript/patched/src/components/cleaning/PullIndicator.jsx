import React from "react";
import { RefreshCw } from "lucide-react";

export default function PullIndicator({ pull, refreshing }) {
  if (!pull) return null;
  return (
    <div className="flex items-end justify-center overflow-hidden" style={{ height: pull }}>
      <RefreshCw
        aria-hidden="true"
        className={`w-5 h-5 mb-2 text-primary ${refreshing ? "animate-spin" : ""}`}
        style={{ transform: `rotate(${pull * 3}deg)`, opacity: Math.min(pull / 70, 1) }}
      />
    </div>
  );
}
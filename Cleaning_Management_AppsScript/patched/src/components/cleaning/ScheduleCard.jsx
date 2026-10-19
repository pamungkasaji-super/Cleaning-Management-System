import React from "react";
import { ChevronRight, Coffee, Car, Building2 } from "lucide-react";
import StatusBadge from "@/components/cleaning/StatusBadge";

export default function ScheduleCard({
  block,
  status,
  detailDone,
  detailTotal,
  onClick,
  missed,
  showShift,
}) {
  const b = block;
  const clickable = !b.is_break && !!onClick;
  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`w-full text-left bg-card rounded-xl shadow p-4 flex items-center gap-3 ${
        b.is_break ? "opacity-80 cursor-default" : "hover:shadow-md"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          b.is_break
            ? "bg-amber-100 dark:bg-amber-500/20"
            : b.is_special
            ? "bg-purple-100 dark:bg-purple-500/20"
            : "bg-primary/10"
        }`}
      >
        {b.is_break ? (
          <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        ) : b.is_special ? (
          <Car className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        ) : (
          <Building2 className="w-5 h-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-foreground truncate">{b.judul}</p>
          {!b.is_break && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {[
            b.start_window && b.end_window ? `${b.start_window} - ${b.end_window}` : "",
            showShift && b.shift ? `Shift ${b.shift}` : "",
            !b.is_break && detailTotal ? `${detailDone}/${detailTotal}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {!b.is_break && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={status} />
            {missed && (
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Tertunda — ketuk untuk melanjutkan
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
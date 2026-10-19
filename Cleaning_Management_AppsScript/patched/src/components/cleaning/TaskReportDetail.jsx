import React from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock, User, CalendarDays, ExternalLink } from "lucide-react";

const fmtTs = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : format(d, "dd/MM/yyyy HH:mm");
};
import { Image } from "@/components/ui/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import StatusBadge from "@/components/cleaning/StatusBadge";
import { getShiftLabel } from "@/lib/cleaningConstants";

export default function TaskReportDetail({ task, open, onOpenChange }) {
  if (!task) return null;
  const hasil = task.hasil_checklist || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left flex items-center justify-between gap-2">
            <span>{task.judul}</span>
            <StatusBadge status={task.status} />
          </DialogTitle>
          <DialogDescription className="text-left space-y-1">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> {task.petugas_nama} · Shift {getShiftLabel(task.shift)}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> {task.tanggal}
            </span>
            {task.start_window && task.end_window && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {task.start_window} - {task.end_window}
              </span>
            )}
            {(task.jam_mulai || task.jam_selesai) && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {task.jam_mulai && <>Mulai: {fmtTs(task.jam_mulai)}</>}
                {task.jam_mulai && task.jam_selesai && " · "}
                {task.jam_selesai && <>Selesai: {fmtTs(task.jam_selesai)}</>}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {hasil.length > 0 && (
          <div>
            <p className="font-semibold text-sm mb-2">
              Checklist ({hasil.filter((h) => h.done).length}/{hasil.length})
            </p>
            <div className="space-y-2">
              {hasil.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {h.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                  )}
                  <span className={h.done ? "" : "text-muted-foreground"}>{h.item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {[
          { title: "Foto Before", photos: task.foto_before },
          { title: "Foto After", photos: task.foto_after },
        ].map(({ title, photos }) => (
          <div key={title}>
            <p className="font-semibold text-sm mb-2">{title}</p>
            {photos && photos.length ? (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((u, i) => (
                  <a
                    key={i}
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block rounded-lg overflow-hidden border aspect-[4/3]"
                  >
                    <Image src={u} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" fittingType="fill" />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-1">
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada foto</p>
            )}
          </div>
        ))}

        {task.catatan && (
          <div>
            <p className="font-semibold text-sm mb-1">Catatan</p>
            <p className="text-sm text-muted-foreground italic">"{task.catatan}"</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/sheetsClient";
import { Repeat, ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/cleaningSession";
import { todayISO } from "@/lib/cleaningConstants";
import { backOr } from "@/lib/nav";
import ScheduleCard from "@/components/cleaning/ScheduleCard";

export default function Periodik() {
  const [list, setList] = useState([]);
  const [trxMap, setTrxMap] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const session = getSession();

  useEffect(() => {
    if (!session) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      const blocks = await db.entities.ShiftSchedule.filter({ is_periodic: true });
      const mine = blocks
        .filter((b) => !b.petugas_kode || b.petugas_kode === session.petugas.kode)
        .sort(
          (a, b) =>
            (a.shift || 0) - (b.shift || 0) ||
            (a.start_window || "").localeCompare(b.start_window || "")
        );
      setList(mine);
      const trx = await db.entities.Transaksi.filter({
        tanggal: todayISO(),
        petugas_kode: session.petugas.kode,
      });
      const map = {};
      trx.forEach((t) => {
        map[t.schedule_id] = t;
      });
      setTrxMap(map);
      setLoading(false);
    })();
  }, []);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-muted/40 p-4 safe-top tab-bar-space">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => backOr(navigate, "/dashboard")}
            aria-label="Kembali"
            className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary" /> Task Periodik
            </h1>
            <p className="text-sm text-muted-foreground">Task berkala sesuai jadwal frekuensi</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-8">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-card rounded-xl">
            Belum ada task periodik
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((b) => {
              const trx = trxMap[b.id];
              const detailDone = (trx?.hasil_checklist || []).filter((h) => h.done).length;
              const detailTotal = b.detail?.length || 0;
              return (
                <ScheduleCard
                  key={b.id}
                  block={b}
                  status={trx?.status || "BELUM"}
                  detailDone={detailDone}
                  detailTotal={detailTotal}
                  onClick={() => navigate(`/task/${b.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
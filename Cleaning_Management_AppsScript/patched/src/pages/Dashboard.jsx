import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/sheetsClient";
import { Button } from "@/components/ui/button";
import {
  User as UserIcon,
  LogOut,
  BarChart3,
  Settings as SettingsIcon,
} from "lucide-react";
import { getSession, clearSession } from "@/lib/cleaningSession";
import { todayISO } from "@/lib/cleaningConstants";
import ScheduleCard from "@/components/cleaning/ScheduleCard";
import PullIndicator from "@/components/cleaning/PullIndicator";
import usePullToRefresh from "@/hooks/usePullToRefresh";
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const [schedule, setSchedule] = useState([]);
  const [trxMap, setTrxMap] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const session = getSession();
  const { user } = useAuth();

  const loadData = async () => {
    const blocks = await db.entities.ShiftSchedule.filter({
      shift: session.shift.value,
    });
    const mine = blocks
      .filter((b) => !b.petugas_kode || b.petugas_kode === session.petugas.kode)
      .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    setSchedule(mine);
    const trx = await db.entities.Transaksi.filter({
      tanggal: todayISO(),
      petugas_kode: session.petugas.kode,
      shift: session.shift.value,
    });
    const map = {};
    trx.forEach((t) => {
      map[t.schedule_id] = t;
    });
    setTrxMap(map);
    setLoading(false);
  };

  const { pull, refreshing, handlers } = usePullToRefresh(loadData);

  useEffect(() => {
    if (!session) {
      navigate("/");
      return;
    }
    loadData();
  }, []);

  if (!session) return null;

  const isAdmin = user?.role === "admin";
  const daily = schedule.filter((b) => !b.is_break && !b.is_periodic);
  const doneCount = daily.filter((b) => trxMap[b.id]?.status === "DONE").length;
  const totalCount = daily.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const ongoing = daily.filter((b) => b.start_window <= nowStr && nowStr < b.end_window);
  const upcoming = daily.filter((b) => b.start_window > nowStr);
  const missed = daily.filter((b) => b.end_window <= nowStr && trxMap[b.id]?.status !== "DONE");
  const completed = daily.filter((b) => b.end_window <= nowStr && trxMap[b.id]?.status === "DONE");

  const signOut = async () => {
    try {
      const logs = await db.entities.ShiftLog.filter({
        tanggal: todayISO(),
        petugas_kode: session.petugas.kode,
        shift: session.shift.value,
      });
      const last = logs.sort((a, b) => (b.login || "").localeCompare(a.login || ""))[0];
      if (last) {
        await db.entities.ShiftLog.update(last.id, {
          logout: new Date().toISOString(),
          status: "CLOSED",
          done_task: doneCount,
          total_task: totalCount,
        });
      }
    } catch (e) {
      /* ignore */
    }
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/40 p-4 safe-top tab-bar-space" {...handlers}>
      <PullIndicator pull={pull} refreshing={refreshing} />
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-card rounded-2xl shadow p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Selamat Datang,</p>
              <p className="text-xl font-bold text-foreground">{session.petugas.nama}</p>
            </div>
            <span className="text-sm bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              {session.shift.label}
            </span>
            <button
              onClick={() => navigate("/settings")}
              aria-label="Pengaturan"
              className="w-11 h-11 rounded-lg bg-muted text-foreground flex items-center justify-center hover:bg-accent"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-5">
            <p className="font-semibold text-sm mb-2">Progress Hari Ini</p>
            <div className="h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-primary/10 to-primary/25">
              <div
                className="h-full rounded-full transition-all bg-gradient-to-r from-primary to-blue-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-right text-sm text-muted-foreground mt-1">
              {doneCount} / {totalCount} Task
            </p>
          </div>
        </div>

        {session.petugas.has_special_task && (
          <div className="text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-lg px-3 py-2">
            Anda memiliki tugas khusus mobil — lihat blok bertanda ungu di jadwal.
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Memuat jadwal...</div>
          ) : (
            <>
              {missed.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    Baru kembali dari penugasan luar kantor? Ada {missed.length} pekerjaan
                    tertunda.
                  </p>
                  <button
                    onClick={() => navigate(`/task/${missed[0].id}`)}
                    className="mt-1 text-sm text-amber-700 dark:text-amber-300 font-semibold underline"
                  >
                    Lanjutkan Pekerjaan Tertunda
                  </button>
                </div>
              )}
              <TaskGroup
                title="Sedang Berlangsung"
                items={ongoing}
                trxMap={trxMap}
                navigate={navigate}
              />
              <TaskGroup
                title="Terlewat — Pekerjaan Tertunda"
                items={missed}
                trxMap={trxMap}
                navigate={navigate}
                missed
              />
              <TaskGroup title="Akan Datang" items={upcoming} trxMap={trxMap} navigate={navigate} />
              <TaskGroup
                title="Sudah Selesai"
                items={completed}
                trxMap={trxMap}
                navigate={navigate}
              />
            </>
          )}
        </div>

        <Button onClick={signOut} variant="destructive" className="w-full h-12">
          <LogOut className="w-5 h-5 mr-2" /> Sign Out Shift
        </Button>
        {isAdmin && (
          <div className="text-center pb-4">
            <button
              onClick={() => navigate("/monitoring")}
              className="text-sm text-primary inline-flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Monitoring
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskGroup({ title, items, trxMap, navigate, missed }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-semibold text-sm text-muted-foreground mb-2">{title}</p>
      <div className="space-y-3">
        {items.map((b) => {
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
              missed={missed}
              onClick={() => navigate(`/task/${b.id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
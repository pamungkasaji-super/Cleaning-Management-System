import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/sheetsClient";
import { ArrowLeft, BarChart3, RotateCcw, UserPlus, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { downloadAllReportsExcel } from "@/lib/exportExcel";
import { Image } from "@/components/ui/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/cleaning/StatusBadge";
import MonitoringCharts from "@/components/cleaning/MonitoringCharts";
import TaskReportDetail from "@/components/cleaning/TaskReportDetail";
import PullIndicator from "@/components/cleaning/PullIndicator";
import usePullToRefresh from "@/hooks/usePullToRefresh";
import { backOr } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { SHIFTS, getShiftLabel } from "@/lib/cleaningConstants";

export default function Monitoring() {
  const [list, setList] = useState([]);
  const [petugasList, setPetugasList] = useState([]);
  const [filterPetugas, setFilterPetugas] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [assignPetugas, setAssignPetugas] = useState("");
  const [assignBlock, setAssignBlock] = useState("");
  const [detail, setDetail] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user]);

  const loadData = async () => {
    const [trx, pet, allBlocks] = await Promise.all([
      db.entities.Transaksi.list("-created_date", 200),
      db.entities.Petugas.filter({ aktif: true }),
      db.entities.ShiftSchedule.list(),
    ]);
    setList(trx);
    setPetugasList(pet);
    setBlocks(
      allBlocks.sort(
        (a, b) =>
          (a.shift || 0) - (b.shift || 0) ||
          (a.start_window || "").localeCompare(b.start_window || "")
      )
    );
    setLoading(false);
  };

  const { pull, refreshing, handlers } = usePullToRefresh(loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = list.filter(
    (t) =>
      (!filterPetugas || t.petugas_kode === filterPetugas) &&
      (!filterShift || String(t.shift) === filterShift)
  );
  const total = filtered.length;
  const doneCount = filtered.filter((t) => t.status === "DONE").length;
  const progressCount = filtered.filter((t) => t.status === "PROGRESS").length;
  const belumCount = filtered.filter((t) => t.status === "BELUM").length;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadAllReportsExcel();
      toast({
        title: "Excel diunduh",
        description: "Data Transaksi dan Log Shift tersimpan sebagai file Excel.",
      });
    } catch (e) {
      toast({ title: "Gagal mengunduh Excel", variant: "destructive" });
    }
    setDownloading(false);
  };

  const reopenTask = async (t) => {
    try {
      await db.entities.Transaksi.update(t.id, { status: "BELUM", jam_selesai: null });
      toast({
        title: "Task di-re-open",
        description: `"${t.judul}" dibuka kembali untuk dikerjakan.`,
      });
      loadData();
    } catch (e) {
      toast({ title: "Gagal re-open task", variant: "destructive" });
    }
  };

  const assignTask = async () => {
    if (!assignPetugas || !assignBlock) return;
    try {
      await db.entities.ShiftSchedule.update(assignBlock, { petugas_kode: assignPetugas });
      toast({
        title: "Task di-assign",
        description: `Task ditugaskan ke ${
          petugasList.find((p) => p.kode === assignPetugas)?.nama || assignPetugas
        }.`,
      });
      setAssignPetugas("");
      setAssignBlock("");
      loadData();
    } catch (e) {
      toast({ title: "Gagal assign task", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 p-4 safe-top tab-bar-space" {...handlers}>
      <PullIndicator pull={pull} refreshing={refreshing} />
      <div className="max-w-3xl mx-auto">
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
              <BarChart3 className="w-5 h-5 text-primary" /> Monitoring
            </h1>
            <p className="text-sm text-muted-foreground">Laporan pekerjaan petugas</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="ml-auto h-10 text-xs"
          >
            <Download className="w-4 h-4 mr-1" />
            {downloading ? "Menyiapkan..." : "Unduh Excel"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Total Laporan" value={total} />
          <Stat label="Done" value={doneCount} color="text-emerald-600" />
          <Stat label="Progress" value={progressCount} color="text-amber-600" />
          <Stat label="Belum" value={belumCount} color="text-zinc-600 dark:text-zinc-400" />
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Select
              value={filterPetugas || "all"}
              onValueChange={(v) => setFilterPetugas(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-full h-10 text-sm" aria-label="Filter petugas">
                <SelectValue placeholder="Semua Petugas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Petugas</SelectItem>
                {petugasList.map((p) => (
                  <SelectItem key={p.kode} value={p.kode}>
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select
              value={filterShift || "all"}
              onValueChange={(v) => setFilterShift(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-full h-10 text-sm" aria-label="Filter shift">
                <SelectValue placeholder="Semua Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Shift</SelectItem>
                {SHIFTS.map((s) => (
                  <SelectItem key={s.value} value={String(s.value)}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!loading && <MonitoringCharts data={filtered} />}

        <div className="bg-card rounded-xl shadow p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm">Assign Task (Admin)</p>
          </div>
          <div className="space-y-2">
            <Select
              value={assignBlock || "none"}
              onValueChange={(v) => setAssignBlock(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full h-10 text-sm" aria-label="Pilih task">
                <SelectValue placeholder="-- Pilih Task --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Pilih Task --</SelectItem>
                {blocks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {[b.shift ? `Shift ${b.shift}` : "", b.start_window, b.judul]
                      .filter(Boolean)
                      .join(" · ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={assignPetugas || "none"}
              onValueChange={(v) => setAssignPetugas(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full h-10 text-sm" aria-label="Pilih petugas">
                <SelectValue placeholder="-- Pilih Petugas --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Pilih Petugas --</SelectItem>
                {petugasList.map((p) => (
                  <SelectItem key={p.kode} value={p.kode}>
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={assignTask}
              disabled={!assignBlock || !assignPetugas}
              className="w-full h-10"
            >
              Assign Task
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-8">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-card rounded-xl">
            Belum ada laporan
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div key={t.id} className="bg-card rounded-xl shadow p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{t.judul}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.petugas_nama} · Shift {getShiftLabel(t.shift)} · {t.tanggal}
                    </p>
                    {t.jam_selesai && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Selesai: {format(new Date(t.jam_selesai), "dd/MM/yyyy HH:mm")}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                {t.status !== "BELUM" && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reopenTask(t)}
                      className="h-8 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Re-open Task
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <PhotoBlock title="Foto Before" photos={t.foto_before} />
                  <PhotoBlock title="Foto After" photos={t.foto_after} />
                </div>
                {(t.hasil_checklist || []).length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {(t.hasil_checklist || []).filter((h) => h.done).length}/
                    {(t.hasil_checklist || []).length} checklist selesai
                  </div>
                )}
                {t.catatan && (
                  <div className="mt-1 text-sm text-muted-foreground italic">"{t.catatan}"</div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDetail(t)}
                  className="h-8 text-xs mt-3"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Detail
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskReportDetail
        task={detail}
        open={!!detail}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
      />
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-card rounded-xl shadow p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function PhotoBlock({ title, photos }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      {photos && photos.length ? (
        <div className="flex gap-1 flex-wrap">
          {photos.map((u, i) => (
            <div key={i} className="w-12 h-12 rounded overflow-hidden border">
              <Image src={u} alt="" className="w-full h-full object-cover" fittingType="fill" />
            </div>
          ))}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      )}
    </div>
  );
}
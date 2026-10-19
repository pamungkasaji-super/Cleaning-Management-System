import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/api/sheetsClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { backOr } from "@/lib/nav";
import { getSession } from "@/lib/cleaningSession";
import { todayISO } from "@/lib/cleaningConstants";
import PhotoUpload from "@/components/cleaning/PhotoUpload";

export default function TaskDetail() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [block, setBlock] = useState(null);
  const [trx, setTrx] = useState(null);
  const [done, setDone] = useState([]);
  const [fotoBefore, setFotoBefore] = useState([]);
  const [fotoAfter, setFotoAfter] = useState([]);
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!session) {
      navigate("/");
      return;
    }
    (async () => {
      const b = await db.entities.ShiftSchedule.get(scheduleId);
      setBlock(b);
      const trxList = await db.entities.Transaksi.filter({
        tanggal: todayISO(),
        petugas_kode: session.petugas.kode,
        schedule_id: scheduleId,
      });
      const existing = trxList[0];
      if (existing) {
        setTrx(existing);
        setDone((existing.hasil_checklist || []).map((h) => h.done));
        setFotoBefore(existing.foto_before || []);
        setFotoAfter(existing.foto_after || []);
        setCatatan(existing.catatan || "");
      } else {
        setDone((b.detail || []).map(() => false));
      }
    })();
  }, [scheduleId]);

  if (!session) return null;
  if (!block) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;

  const toggle = (i) => setDone((d) => d.map((v, idx) => (idx === i ? !v : v)));
  const doneCount = done.filter(Boolean).length;
  const total = block.detail?.length || 0;
  const status = doneCount === 0 ? "BELUM" : doneCount === total ? "DONE" : "PROGRESS";
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const isMissed = !!block.end_window && block.end_window <= nowStr && status !== "DONE";

  const save = async () => {
    setSaving(true);
    const hasil = (block.detail || []).map((item, i) => ({ item, done: !!done[i] }));
    const payload = {
      tanggal: todayISO(),
      petugas_kode: session.petugas.kode,
      petugas_nama: session.petugas.nama,
      shift: session.shift.value,
      shift_label: session.shift.label,
      schedule_id: scheduleId,
      judul: block.judul,
      start_window: block.start_window,
      end_window: block.end_window,
      status,
      hasil_checklist: hasil,
      foto_before: fotoBefore,
      foto_after: fotoAfter,
      catatan,
      jam_selesai: status === "DONE" ? new Date().toISOString() : trx?.jam_selesai || null,
    };
    try {
      if (trx) {
        await db.entities.Transaksi.update(trx.id, payload);
      } else {
        payload.jam_mulai = new Date().toISOString();
        await db.entities.Transaksi.create(payload);
      }
    } catch (e) {
      setSaving(false);
      toast({
        title: "Gagal menyimpan",
        description: "Perubahan belum tersimpan. Periksa koneksi Anda, lalu coba lagi.",
        variant: "destructive",
      });
      return;
    }
    setSaving(false);
    navigate("/dashboard");
  };

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
            <h1 className="text-lg font-bold">{block.judul}</h1>
            <p className="text-sm text-muted-foreground">
              {block.start_window && block.end_window ? `${block.start_window} - ${block.end_window} · ` : ""}
              {block.fokus_area || "Checklist Area"}
            </p>
            {isMissed && (
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-1">
                Tugas terlewat — lanjutkan pekerjaan yang belum selesai
              </p>
            )}
          </div>
        </div>

        {block.catatan_khusus && (
          <div className="mb-4 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
            {block.catatan_khusus}
          </div>
        )}

        <div className="bg-card rounded-2xl shadow p-4 space-y-4">
          <PhotoUpload label="Foto Before" files={fotoBefore} onChange={setFotoBefore} folder="before" />

          <div className="space-y-2">
            {(block.detail || []).map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg border-l-4 ${
                  done[i]
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10"
                    : "border-red-500 bg-card"
                } p-3`}
              >
                <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item}</p>
                  <p className={`text-sm ${done[i] ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {done[i] ? "Done" : "Belum"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-label={done[i] ? "Tandai belum selesai" : "Tandai selesai"}
                  aria-pressed={!!done[i]}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    done[i] ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                      done[i] ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <PhotoUpload label="Foto After" files={fotoAfter} onChange={setFotoAfter} folder="after" />

          <div>
            <p className="font-semibold text-sm mb-2">Catatan</p>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan jika diperlukan..."
              className="w-full rounded-lg border border-border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button onClick={save} disabled={saving} className="w-full h-12 font-semibold">
            <Save className="w-5 h-5 mr-2" /> Simpan ({doneCount}/{total})
          </Button>
        </div>
      </div>
    </div>
  );
}
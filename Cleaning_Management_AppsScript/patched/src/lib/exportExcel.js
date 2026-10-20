import { format } from "date-fns";
import * as XLSX from "xlsx";
import { db } from "@/api/sheetsClient";
import { todayISO } from "@/lib/cleaningConstants";

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : format(d, "dd/MM/yyyy HH:mm");
};

// range opsional: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } (salah satu boleh kosong)
const rangeQuery = ({ from, to } = {}) => {
  if (!from && !to) return null;
  const q = {};
  if (from) q.$gte = from;
  if (to) q.$lte = to;
  return { tanggal: q };
};

export async function downloadAllReportsExcel(range) {
  const query = rangeQuery(range);
  const load = (entity) =>
    query
      ? db.entities[entity].filter(query, "-created_date", 5000)
      : db.entities[entity].list("-created_date", 5000);
  const [trx, logs] = await Promise.all([load("Transaksi"), load("ShiftLog")]);

  const rowsTrx = trx.map((t) => ({
    Tanggal: t.tanggal || "",
    "Kode Petugas": t.petugas_kode || "",
    "Nama Petugas": t.petugas_nama || "",
    Shift: t.shift_label || "",
    Judul: t.judul || "",
    "Jendela Waktu":
      t.start_window && t.end_window ? `${t.start_window} - ${t.end_window}` : "",
    Status: t.status || "",
    Checklist: `${(t.hasil_checklist || []).filter((h) => h.done).length}/${
      (t.hasil_checklist || []).length
    }`,
    "Detail Checklist": (t.hasil_checklist || [])
      .map((h) => `${h.item}: ${h.done ? "Selesai" : "Belum"}`)
      .join("; "),
    "Jam Mulai": fmt(t.jam_mulai),
    "Jam Selesai": fmt(t.jam_selesai),
    Catatan: t.catatan || "",
    "Jumlah Foto Before": (t.foto_before || []).length,
    "Jumlah Foto After": (t.foto_after || []).length,
    "URL Foto Before": (t.foto_before || []).join(" | "),
    "URL Foto After": (t.foto_after || []).join(" | "),
  }));

  const rowsLog = logs.map((l) => ({
    Tanggal: l.tanggal || "",
    "Kode Petugas": l.petugas_kode || "",
    "Nama Petugas": l.petugas_nama || "",
    Shift: l.shift_label || "",
    Login: fmt(l.login),
    Logout: fmt(l.logout),
    "Total Task": l.total_task ?? "",
    "Done Task": l.done_task ?? "",
    Status: l.status || "",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsTrx), "Transaksi");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsLog), "Log Shift");
  const suffix =
    range && (range.from || range.to)
      ? `${range.from || "awal"}_sd_${range.to || "akhir"}`
      : todayISO();
  XLSX.writeFile(wb, `laporan-cleaning-${suffix}.xlsx`);
}
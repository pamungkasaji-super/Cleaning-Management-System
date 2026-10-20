import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/sheetsClient";
import { backOr } from "@/lib/nav";

export default function KelolaPengguna() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyEmail, setBusyEmail] = useState("");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const isAdmin = user?.role === "admin";

  const load = async () => {
    try {
      setUsers(await db.users.list());
    } catch (err) {
      toast({ title: "Gagal memuat pengguna", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.email, u.nama, u.petugas_kode, u.role].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [users, query]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const toggleActive = async (u) => {
    setBusyEmail(u.email);
    try {
      await db.users.setActive(u.email, !u.aktif);
      setUsers((list) => list.map((x) => (x.email === u.email ? { ...x, aktif: !u.aktif } : x)));
      toast({ title: u.aktif ? "Akun dinonaktifkan" : "Akun diaktifkan", description: u.email });
    } catch (err) {
      toast({ title: "Gagal mengubah akun", description: err.message, variant: "destructive" });
    } finally {
      setBusyEmail("");
    }
  };

  const confirmDelete = async () => {
    const u = toDelete;
    setToDelete(null);
    if (!u) return;
    setBusyEmail(u.email);
    try {
      await db.users.remove(u.email);
      setUsers((list) => list.filter((x) => x.email !== u.email));
      toast({ title: "Akun dihapus", description: u.email });
    } catch (err) {
      toast({ title: "Gagal menghapus akun", description: err.message, variant: "destructive" });
    } finally {
      setBusyEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 p-4 safe-top tab-bar-space">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => backOr(navigate, "/settings")}
            aria-label="Kembali"
            className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Kelola Pengguna</h1>
            <p className="text-sm text-muted-foreground">Nonaktifkan atau hapus akun</p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, atau kode"
            className="pl-9 h-11"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Tidak ada pengguna.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => {
              const isSelf = u.email === user.email;
              const busy = busyEmail === u.email;
              return (
                <div key={u.email} className="bg-card rounded-2xl shadow p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{u.nama || u.email}</p>
                      {u.nama && <p className="text-sm text-muted-foreground break-all">{u.email}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {u.role}
                        {u.petugas_kode ? ` · ${u.petugas_kode}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${
                        u.aktif
                          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>

                  {isSelf ? (
                    <p className="text-xs text-muted-foreground mt-3">Ini akun Anda. Tidak dapat diubah dari sini.</p>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-10"
                        disabled={busy}
                        onClick={() => toggleActive(u)}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : u.aktif ? (
                          <UserX className="w-4 h-4 mr-2" />
                        ) : (
                          <UserCheck className="w-4 h-4 mr-2" />
                        )}
                        {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 text-destructive border-destructive/40"
                        disabled={busy}
                        aria-label={`Hapus ${u.email}`}
                        onClick={() => setToDelete(u)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.email} akan dihapus dan tidak bisa masuk lagi. Riwayat laporan yang pernah
              diisi tetap tersimpan. Jika hanya ingin menutup akses sementara, pilih Nonaktifkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Ya, hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { ShieldCheck, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { db } from "@/api/sheetsClient";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "monitoring", label: "Monitoring" },
  { value: "user", label: "User" },
];

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export default function ManageUsers() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [petugas, setPetugas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState("");
  const [email, setEmail] = useState("");
  const [nama, setNama] = useState("");
  const [role, setRole] = useState("user");
  const [kode, setKode] = useState("");
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const loadUsers = async () => {
    try {
      setUsers(await db.users.list());
    } catch (e) {
      toast({ title: "Gagal memuat daftar akun", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
    db.entities.Petugas.filter({ aktif: true }).then(setPetugas).catch(() => {});
  }, []);

  const changeRole = async (u, newRole) => {
    if (newRole === u.role) return;
    const before = users;
    setUsers(users.map((x) => (x.email === u.email ? { ...x, role: newRole } : x)));
    setSavingEmail(u.email);
    try {
      await db.users.setRole(u.email, newRole);
      toast({ title: "Role diperbarui", description: `${u.nama || u.email} sekarang ${newRole}.` });
    } catch (e) {
      setUsers(before); // kembalikan tampilan jika gagal
      toast({ title: "Gagal mengubah role", description: e.message, variant: "destructive" });
    }
    setSavingEmail("");
  };

  // Nonaktifkan / aktifkan akun (berlaku seketika, termasuk untuk sesi yang sedang login)
  const toggleActive = async (u) => {
    const nowActive = u.aktif !== false;
    setSavingEmail(u.email);
    try {
      await db.users.setActive(u.email, !nowActive);
      setUsers((list) => list.map((x) => (x.email === u.email ? { ...x, aktif: !nowActive } : x)));
      toast({
        title: nowActive ? "Akun dinonaktifkan" : "Akun diaktifkan",
        description: u.nama || u.email,
      });
    } catch (e) {
      toast({ title: "Gagal mengubah status akun", description: e.message, variant: "destructive" });
    }
    setSavingEmail("");
  };

  // Hapus akun (riwayat laporan tetap tersimpan)
  const confirmDelete = async () => {
    const u = toDelete;
    setToDelete(null);
    if (!u) return;
    setSavingEmail(u.email);
    try {
      await db.users.remove(u.email);
      setUsers((list) => list.filter((x) => x.email !== u.email));
      toast({ title: "Akun dihapus", description: u.nama || u.email });
    } catch (e) {
      toast({ title: "Gagal menghapus akun", description: e.message, variant: "destructive" });
    }
    setSavingEmail("");
  };

  const addUser = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      await db.users.add({ email, nama, role, petugas_kode: kode });
      toast({ title: "Akun ditambahkan", description: `${email.trim().toLowerCase()} bisa masuk dengan Google.` });
      setEmail("");
      setNama("");
      setRole("user");
      setKode("");
      await loadUsers();
    } catch (e) {
      toast({ title: "Gagal menambah akun", description: e.message, variant: "destructive" });
    }
    setAdding(false);
  };

  return (
    <>
      <div className="bg-card rounded-2xl shadow p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <p className="font-semibold text-sm">Kelola Role (Admin)</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Atur akses setiap akun: Admin (semua akses), Monitoring (lihat laporan), User (petugas).
          Akun yang dinonaktifkan atau dihapus tidak bisa masuk lagi.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-2">Memuat akun...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Belum ada akun terdaftar.</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => {
              const isSelf = same(u.email, me?.email);
              const isActive = u.aktif !== false;
              const busy = savingEmail === u.email;
              return (
                <div
                  key={u.email}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className={`min-w-0 sm:flex-1 ${isActive ? "" : "opacity-60"}`}>
                    <p className="font-semibold text-sm truncate">
                      {u.nama || u.email}
                      {!isActive && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Nonaktif</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={u.role || "user"}
                      onValueChange={(v) => changeRole(u, v)}
                      disabled={isSelf || busy}
                    >
                      <SelectTrigger
                        className="w-32 sm:w-36 h-11 shrink-0"
                        aria-label={`Role ${u.nama || u.email}`}
                        title={isSelf ? "Role akun sendiri tidak bisa diubah" : undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {isSelf ? (
                      <>
                        {/* ruang kosong agar kolom role tetap sejajar dengan baris lain di layar lebar */}
                        <div aria-hidden="true" className="hidden sm:block sm:w-40" />
                        <div aria-hidden="true" className="hidden sm:block w-11" />
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="h-11 flex-1 sm:flex-none sm:w-40"
                          disabled={busy}
                          onClick={() => toggleActive(u)}
                        >
                          {isActive ? (
                            <UserX className="w-4 h-4 mr-2" />
                          ) : (
                            <UserCheck className="w-4 h-4 mr-2" />
                          )}
                          {isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 w-11 p-0 shrink-0 text-destructive border-destructive/40"
                          disabled={busy}
                          aria-label={`Hapus ${u.nama || u.email}`}
                          onClick={() => setToDelete(u)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl shadow p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="w-4 h-4 text-primary" />
          <p className="font-semibold text-sm">Tambah Akun</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Gunakan email Google. Akun langsung bisa masuk setelah ditambahkan.
        </p>
        <div className="space-y-2">
          <Input
            type="email"
            inputMode="email"
            placeholder="Email Google"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            aria-label="Email"
          />
          <Input
            placeholder="Nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="h-11"
            aria-label="Nama"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full h-11" aria-label="Role akun baru">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kode || "none"} onValueChange={(v) => setKode(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full h-11" aria-label="Petugas terkait">
              <SelectValue placeholder="Petugas (opsional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tanpa petugas</SelectItem>
              {petugas.map((p) => (
                <SelectItem key={p.kode} value={p.kode}>
                  {p.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addUser} disabled={!email.trim() || adding} className="w-full h-11">
            {adding ? "Menambahkan..." : "Tambah Akun"}
          </Button>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.nama || toDelete?.email} ({toDelete?.email}) akan dihapus dan tidak bisa
              masuk lagi. Riwayat laporan yang pernah diisi tetap tersimpan. Jika hanya ingin menutup
              akses sementara, pilih Nonaktifkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Ya, hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

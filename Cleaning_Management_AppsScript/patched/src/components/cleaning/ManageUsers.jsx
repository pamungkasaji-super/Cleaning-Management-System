import React, { useEffect, useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
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
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-2">Memuat akun...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Belum ada akun terdaftar.</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const isSelf = same(u.email, me?.email);
              return (
                <div key={u.email} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {u.nama || u.email}
                      {u.aktif === false && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Nonaktif</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Select
                    value={u.role || "user"}
                    onValueChange={(v) => changeRole(u, v)}
                    disabled={isSelf || savingEmail === u.email}
                  >
                    <SelectTrigger
                      className="w-36 h-11 shrink-0"
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
    </>
  );
}

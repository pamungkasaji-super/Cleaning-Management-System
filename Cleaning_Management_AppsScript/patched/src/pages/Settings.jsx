import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User as UserIcon, Car, LogOut } from "lucide-react";
import { getSession } from "@/lib/cleaningSession";
import { useAuth } from "@/lib/AuthContext";
import { backOr } from "@/lib/nav";

export default function Settings() {
  const navigate = useNavigate();
  const session = getSession();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!session) navigate("/", { replace: true });
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
            <h1 className="text-lg font-bold">Pengaturan</h1>
            <p className="text-sm text-muted-foreground">Profil & akun</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow p-5 mb-4">
          <p className="text-sm text-muted-foreground">Akun</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className="text-lg font-bold text-foreground break-all">{user?.email}</p>
            <span className="text-sm bg-muted px-2.5 py-1 rounded-full text-muted-foreground shrink-0">
              {isAdmin ? "Admin" : "User"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Akun Google ini dipakai untuk masuk ke aplikasi.
          </p>
          <Button
            variant="outline"
            className="w-full h-12 mt-3"
            onClick={() => logout()}
          >
            <LogOut className="w-5 h-5 mr-2" /> Keluar Akun
          </Button>
        </div>

        <div className="bg-card rounded-2xl shadow p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Petugas</p>
              <p className="text-xl font-bold text-foreground">{session.petugas.nama}</p>
              <p className="text-sm text-muted-foreground">
                {session.petugas.kode ? `Kode: ${session.petugas.kode} · ` : ""}
                {session.petugas.role || "OB"}
              </p>
            </div>
          </div>
          {session.petugas.has_special_task && (
            <div className="mt-3 text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
              <Car className="w-4 h-4" /> Tugas khusus mobil aktif untuk petugas ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
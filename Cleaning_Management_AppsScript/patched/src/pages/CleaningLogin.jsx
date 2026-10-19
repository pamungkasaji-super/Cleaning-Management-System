import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/sheetsClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User as UserIcon, Clock, ArrowRight } from "lucide-react";
import { SHIFTS, todayISO } from "@/lib/cleaningConstants";
import { setSession } from "@/lib/cleaningSession";
import SuperLogo from "@/components/cleaning/SuperLogo";

export default function CleaningLogin() {
  const [list, setList] = useState([]);
  const [petugasKode, setPetugasKode] = useState("");
  const [shift, setShift] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    db.entities.Petugas
      .filter({ aktif: true })
      .then((list) => {
        setList(list);
        if (user?.petugas_kode && list.some((p) => p.kode === user.petugas_kode)) {
          setPetugasKode(user.petugas_kode);
        }
      })
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!petugasKode || !shift) return;
    setLoading(true);
    const petugas = list.find((p) => p.kode === petugasKode);
    const shiftObj = SHIFTS.find((s) => s.value === Number(shift));
    try {
      await db.entities.ShiftLog.create({
        tanggal: todayISO(),
        petugas_kode: petugas.kode,
        petugas_nama: petugas.nama,
        shift: shiftObj.value,
        shift_label: shiftObj.label,
        login: new Date().toISOString(),
        status: "OPEN",
        total_task: 0,
        done_task: 0,
      });
    } catch (e) {
      /* ignore */
    }
    try {
      await db.auth.updateMe({ petugas_kode: petugas.kode });
    } catch (e) {
      /* ignore */
    }
    setSession(petugas, shiftObj);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4 safe-top relative">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <SuperLogo />
          <h1 className="text-3xl font-bold mt-3 text-foreground">Cleaning Management</h1>
        </div>
        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 font-semibold text-sm mb-2">
              <UserIcon className="w-4 h-4 text-primary" /> Petugas
            </label>
            <Select value={petugasKode} onValueChange={setPetugasKode}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="-- Pilih Petugas --" />
              </SelectTrigger>
              <SelectContent>
                {list.map((p) => (
                  <SelectItem key={p.kode} value={p.kode}>
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="flex items-center gap-2 font-semibold text-sm mb-2">
              <Clock className="w-4 h-4 text-primary" /> Shift
            </label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="-- Pilih Shift --" />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((s) => (
                  <SelectItem key={s.value} value={String(s.value)}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={submit}
            disabled={!petugasKode || !shift || loading}
            className="w-full h-12 text-base font-semibold"
          >
            <ArrowRight className="w-5 h-5 mr-2" /> MASUK
          </Button>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground px-4">
        <button
          onClick={() => logout()}
          className="text-primary font-medium hover:underline mb-1"
        >
          Keluar Akun
        </button>
        <div>Version 1.0</div>
        <div>© 2026 by Pam</div>
      </div>
    </div>
  );
}
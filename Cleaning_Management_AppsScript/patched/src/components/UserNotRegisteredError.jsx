import React from "react";
import { useAuth } from "@/lib/AuthContext";

const UserNotRegisteredError = () => {
  const { authError, logout } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Akses Dibatasi</h1>
        <p className="text-slate-600 mb-6">
          {authError?.message || "Akun Anda belum terdaftar di aplikasi ini."} Hubungi admin untuk meminta akses.
        </p>
        <button
          onClick={() => logout()}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700"
        >
          Keluar
        </button>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;

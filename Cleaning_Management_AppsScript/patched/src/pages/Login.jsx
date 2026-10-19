import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LogIn, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    const script = existing || document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Gagal memuat Google Sign-In")));
    if (!existing) {
      script.src = GSI_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export default function Login() {
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    if (!CLIENT_ID) {
      setError("VITE_GOOGLE_CLIENT_ID belum diatur di file .env");
      return;
    }
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response) => {
            setError("");
            setBusy(true);
            try {
              await loginWithGoogle(response.credential);
              navigate("/", { replace: true });
            } catch (err) {
              setError(err.message || "Gagal masuk. Coba lagi.");
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.min(320, buttonRef.current.offsetWidth || 320),
        });
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <AuthLayout
      icon={LogIn}
      title="Cleaning Management"
      subtitle="Masuk dengan akun Google Anda"
      footer="Hanya email yang sudah didaftarkan admin yang dapat masuk."
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
      <div className="flex justify-center min-h-[44px]">
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa akun...
          </div>
        )}
        <div ref={buttonRef} className={busy ? "hidden" : ""} />
      </div>
    </AuthLayout>
  );
}

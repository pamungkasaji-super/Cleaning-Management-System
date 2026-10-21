import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { db } from "@/api/sheetsClient";
import { clearSession } from "@/lib/cleaningSession";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Memeriksa sesi tersimpan (token) ke server
  const checkUserAuth = useCallback(async () => {
    if (!db.auth.hasSession()) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }
    try {
      setIsLoadingAuth(true);
      const me = await db.auth.me();
      setUser(me);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
     setUser(null);
     setIsAuthenticated(false);
     if (err.code === "NOT_REGISTERED") {
       db.auth.clearToken();
       setAuthError({ type: "user_not_registered", message: err.message });
     } else if (err.code === "UNAUTHORIZED") {
       db.auth.clearToken();
     }
      // Gangguan jaringan: token dipertahankan, pengguna bisa muat ulang
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  // Server menyatakan sesi tidak valid di tengah pemakaian
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  // Dipanggil halaman Login setelah Google memberi ID token
  const loginWithGoogle = async (idToken) => {
    const me = await db.auth.loginWithGoogle(idToken);
    setUser(me);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
    return me;
  };

    const logout = async (shouldRedirect = true) => {
     await db.auth.logout();
    clearSession();
    window.google?.accounts?.id?.disableAutoSelect?.();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    if (shouldRedirect) window.location.href = "/login";
  };

  const navigateToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        authChecked,
        loginWithGoogle,
        logout,
        navigateToLogin,
        checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

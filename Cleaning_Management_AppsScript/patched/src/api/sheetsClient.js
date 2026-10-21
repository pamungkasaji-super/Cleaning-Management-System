// Klien untuk backend Google Apps Script (Spreadsheet + Drive).
// API-nya sengaja dibuat sama dengan base44.entities (list / filter / get / create / update / delete),
// sehingga halaman cukup mengganti `base44.entities.X` menjadi `db.entities.X`.

const API_URL = import.meta.env.VITE_SHEETS_API_URL;
const TIMEOUT_MS = 30000;
const TOKEN_KEY = "cleaning_auth_token";

const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ }
};

class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function call(payload, timeoutMs = TIMEOUT_MS) {
  if (!API_URL) throw new Error("VITE_SHEETS_API_URL belum diatur di file .env");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // text/plain = "simple request": tidak memicu preflight CORS yang tidak didukung Apps Script
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: getToken(), ...payload }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Server mengembalikan status ${res.status}`);
    const json = await res.json();
    if (!json.ok) {
      // Sesi habis / token tidak valid: bersihkan dan beri tahu AuthContext
      if (json.code === "UNAUTHORIZED" && payload.action !== "login") {
        setToken(null);
        window.dispatchEvent(new Event("auth:expired"));
      }
      throw new ApiError(json.error || "Permintaan gagal", json.code);
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

const makeEntity = (entity) => ({
  list: (sort, limit) => call({ action: "list", entity, sort, limit }),
  filter: (query, sort, limit) => call({ action: "filter", entity, query, sort, limit }),
  get: (id) => call({ action: "get", entity, id }),
  create: (data) => call({ action: "create", entity, data }),
  update: (id, data) => call({ action: "update", entity, id, data }),
  delete: (id) => call({ action: "delete", entity, id }),
});

// Perkecil foto (sisi terpanjang 1280px, JPEG 0.8) agar upload dari HP cepat dan hemat kuota.
async function compressImage(file, maxSide = 1280, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob || file;
}

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("Gagal membaca file"));
    r.readAsDataURL(blob);
  });

export const db = {
  auth: {
    getToken,
    hasSession: () => !!getToken(),
    // Tukar ID token Google dengan token sesi aplikasi
    async loginWithGoogle(idToken) {
      const { token, user } = await call({ action: "login", idToken });
      setToken(token);
      return user;
    },
    me: () => call({ action: "me" }),
    updateMe: (data) => call({ action: "updateMe", data }),
       clearToken: () => setToken(null),
   async logout() {
     try {
       if (getToken()) await call({ action: "logout" }, 4000);
     } catch {
       /* jaringan bermasalah: tetap keluar */
     }
     setToken(null);
   },
  },
  // Kelola akun (khusus admin; backend menolak role lain)
  users: {
    list: () => call({ action: "listUsers" }),
    setRole: (email, role) => call({ action: "setUserRole", email, role }),
    add: (data) => call({ action: "addUser", data }),
    setActive: (email, aktif) => call({ action: "setUserActive", email, aktif }),
    remove: (email) => call({ action: "deleteUser", email }),
  },
  entities: {
    Petugas: makeEntity("Petugas"),
    ShiftLog: makeEntity("ShiftLog"),
    ShiftSchedule: makeEntity("ShiftSchedule"),
    Transaksi: makeEntity("Transaksi"),
  },
  // folder: "before" | "after". Mengembalikan { file_id, file_url, drive_link }
  async uploadPhoto(file, folder) {
    let blob = file;
    try {
      blob = await compressImage(file);
    } catch {
      /* format tidak didukung browser: kirim file asli */
    }
    const base64 = await toBase64(blob);
    return call({
      action: "upload",
      data: { base64, mimeType: blob.type || "image/jpeg", filename: file.name, folder },
    });
  },
};

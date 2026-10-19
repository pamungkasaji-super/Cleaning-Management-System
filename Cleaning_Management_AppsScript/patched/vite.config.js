import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// File ini kosong (0 byte) pada ekspor Base44, jadi dibuat ulang.
// Fungsinya: mengaktifkan React dan alias "@/..." -> "src/...".
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

import React, { useRef, useState } from "react";
import { Upload, X, Camera } from "lucide-react";
import { db } from "@/api/sheetsClient";
import { useToast } from "@/components/ui/use-toast";
import { Image } from "@/components/ui/image";

export default function PhotoUpload({ label, files, onChange, folder }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const list = files || [];

  const { toast } = useToast();

  const handle = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setUploading(true);
    const urls = [];
    let failed = 0;
    for (const f of picked) {
      try {
        // Foto langsung masuk ke folder Google Drive (Before / After)
        const { file_url } = await db.uploadPhoto(f, folder);
        urls.push(file_url);
      } catch (err) {
        failed += 1;
      }
    }
    setUploading(false);
    if (urls.length) onChange([...list, ...urls]);
    if (failed) {
      toast({
        title: "Sebagian foto gagal diunggah",
        description: `${failed} foto belum tersimpan di Google Drive. Periksa koneksi lalu coba lagi.`,
        variant: "destructive",
      });
    }
  };

  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <Image src={url} alt="" className="w-full h-full object-cover" fittingType="fill" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Hapus foto"
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Pilih foto"
          className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
        >
          {uploading ? (
            <span className="text-sm">Uploading...</span>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span className="text-sm mt-1">Pilih</span>
            </>
          )}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handle} />
    </div>
  );
}
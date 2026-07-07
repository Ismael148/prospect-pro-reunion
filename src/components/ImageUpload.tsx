import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";


interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  folder: string;
  required?: boolean;
}

export function ImageUpload({ label, value, onChange, folder, required }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("client-forms")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // Bucket privé : URL signée longue durée (~10 ans)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("client-forms")
        .createSignedUrl(fileName, 315360000);

      if (signedError || !signedData?.signedUrl) throw signedError || new Error("URL signée indisponible");

      onChange(signedData.signedUrl);
      toast.success("Image uploadée !");
    } catch (err: any) {
      toast.error("Erreur d'upload : " + (err.message || "Réessayez"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="w-28 h-28 object-cover rounded-xl border border-border"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:opacity-80 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed flex flex-col gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cliquez pour uploader</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface GalleryUploadProps {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  max?: number;
}

export function GalleryUpload({ label, values, onChange, folder, max = 10 }: GalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = max - values.length;
    if (files.length > remaining) {
      toast.error(`Maximum ${max} images. Il reste ${remaining} emplacement(s).`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) continue;

        const ext = file.name.split(".").pop();
        const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from("client-forms")
          .upload(fileName, file, { upsert: true });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("client-forms")
          .getPublicUrl(fileName);

        newUrls.push(urlData.publicUrl);
      }

      onChange([...values, ...newUrls]);
      toast.success(`${newUrls.length} image(s) uploadée(s) !`);
    } catch (err: any) {
      toast.error("Erreur d'upload : " + (err.message || "Réessayez"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative">
            <img
              src={url}
              alt={`Galerie ${i + 1}`}
              className="w-full aspect-square object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] hover:opacity-80 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {values.length < max && (
          <Button
            type="button"
            variant="outline"
            className="aspect-square border-dashed flex flex-col gap-0.5 h-auto"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Ajouter</span>
              </>
            )}
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{values.length}/{max} images</p>
    </div>
  );
}

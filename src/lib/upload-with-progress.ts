import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Upload d'un fichier vers Supabase Storage avec progression temps réel.
 * Utilise XHR (au lieu du client JS) pour exposer l'événement `progress`
 * et supporter les gros fichiers (vidéos > 60 Mo) sans timeout silencieux.
 */
export async function uploadFileWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Session expirée, reconnectez-vous");

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.timeout = 30 * 60 * 1000; // 30 min pour les grosses vidéos

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      onProgress?.({
        loaded: e.loaded,
        total: e.total,
        percent: Math.round((e.loaded / e.total) * 100),
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        resolve();
      } else {
        let message = `Échec de l'envoi (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (parsed?.message) message = parsed.message;
        } catch {
          /* réponse non JSON */
        }
        if (xhr.status === 413) message = "Fichier trop volumineux pour le stockage";
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi"));
    xhr.ontimeout = () => reject(new Error("Délai dépassé pendant l'envoi"));
    xhr.onabort = () => reject(new Error("Envoi annulé"));

    signal?.addEventListener("abort", () => xhr.abort());

    xhr.send(file);
  });

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

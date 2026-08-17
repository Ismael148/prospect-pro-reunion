import { supabase } from "@/integrations/supabase/client";
import * as tus from "tus-js-client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  /** Vitesse instantanée en octets/seconde */
  speed?: number;
  /** Temps restant estimé en secondes */
  eta?: number;
}

/** Au-delà de ce seuil on bascule sur l'upload repris (tus) par tranches. */
const RESUMABLE_THRESHOLD = 20 * 1024 * 1024; // 20 Mo
const CHUNK_SIZE = 6 * 1024 * 1024; // imposé par Supabase Storage

function createSpeedTracker(onProgress?: (p: UploadProgress) => void) {
  const start = Date.now();
  let lastLoaded = 0;
  let lastTime = start;
  let speed = 0;

  return (loaded: number, total: number) => {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    if (dt > 0.3) {
      const inst = (loaded - lastLoaded) / dt;
      // lissage exponentiel pour un affichage stable
      speed = speed ? speed * 0.7 + inst * 0.3 : inst;
      lastLoaded = loaded;
      lastTime = now;
    }
    const avg = (loaded / Math.max(1, now - start)) * 1000;
    const effective = speed || avg;
    onProgress?.({
      loaded,
      total,
      percent: Math.round((loaded / total) * 100),
      speed: effective,
      eta: effective > 0 ? Math.max(0, (total - loaded) / effective) : undefined,
    });
  };
}

/**
 * Upload d'un fichier vers Supabase Storage avec progression temps réel.
 * - Petits fichiers : POST direct (XHR) — un seul aller-retour, le plus rapide.
 * - Gros fichiers (> 20 Mo) : protocole tus par tranches de 6 Mo, avec reprise
 *   automatique en cas de coupure réseau (aucun redémarrage à zéro).
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

  const track = createSpeedTracker(onProgress);

  if (file.size > RESUMABLE_THRESHOLD) {
    await uploadResumable(bucket, path, file, token, track, signal);
  } else {
    await uploadDirect(bucket, path, file, token, track, signal);
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function uploadResumable(
  bucket: string,
  path: string,
  file: File,
  token: string,
  track: (loaded: number, total: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onProgress: (loaded, total) => track(loaded, total),
      onSuccess: () => {
        track(file.size, file.size);
        resolve();
      },
      onError: (err: any) => {
        const detail = err?.originalResponse?.getBody?.();
        reject(new Error(detail || err?.message || "Échec de l'envoi"));
      },
    });

    signal?.addEventListener("abort", () => {
      upload.abort();
      reject(new Error("Envoi annulé"));
    });

    // Reprend un envoi précédent du même fichier si disponible
    upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}

function uploadDirect(
  bucket: string,
  path: string,
  file: File,
  token: string,
  track: (loaded: number, total: number) => void,
  signal?: AbortSignal,
) {
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`;

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.timeout = 30 * 60 * 1000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) track(e.loaded, e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        track(file.size, file.size);
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
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatSpeed(bytesPerSec?: number) {
  if (!bytesPerSec || !isFinite(bytesPerSec)) return "";
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds?: number) {
  if (seconds === undefined || !isFinite(seconds)) return "";
  if (seconds < 60) return `${Math.ceil(seconds)}s restantes`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m} min ${String(s).padStart(2, "0")}s restantes`;
}

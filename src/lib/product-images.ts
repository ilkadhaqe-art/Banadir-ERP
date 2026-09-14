import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Product / branding images live in the private `product-images` storage
 * bucket. The database stores the object PATH; the browser resolves it to a
 * short-lived signed URL for display. Plain http(s) values are passed through
 * unchanged so legacy URL-based images keep working.
 */

export const IMAGE_BUCKET = "product-images";
const SIGN_TTL = 60 * 60 * 24 * 7;

export function isRemoteUrl(value: string) {
  return /^(https?:|data:|blob:)/i.test(value);
}

/** Uploads a picked file and returns the storage path to persist. */
export async function uploadImageFile(file: File, folder = "products"): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);
  return path;
}

async function signMany(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(paths, SIGN_TTL);
  if (error) return {};
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

/** Batch resolver — returns a lookup of stored value → displayable URL. */
export function useSignedImageUrls(values: (string | null | undefined)[]) {
  const paths = Array.from(
    new Set(values.map((v) => (v ?? "").trim()).filter((v) => v.length > 0 && !isRemoteUrl(v))),
  ).sort();

  const { data } = useQuery({
    queryKey: ["storage-signed-urls", paths],
    enabled: paths.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: () => signMany(paths),
  });

  return (value: string | null | undefined): string | null => {
    const raw = (value ?? "").trim();
    if (!raw) return null;
    if (isRemoteUrl(raw)) return raw;
    return data?.[raw] ?? null;
  };
}

/** Single-value convenience wrapper. */
export function useSignedImageUrl(value: string | null | undefined) {
  const resolve = useSignedImageUrls([value]);
  return resolve(value);
}

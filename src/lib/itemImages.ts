import { api, json, uploadImageFile } from "./api";
import { supabase } from "./supabase";

export const ITEM_IMAGE_BUCKET = "item-images";
export const MAX_ITEM_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ITEM_IMAGES = 4;

const formats = {
  jpg: { mime: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
  jpeg: { mime: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
  png: { mime: "image/png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  webp: { mime: "image/webp", signature: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] },
} as const;

const validItemImagePath = (path: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i.test(path);

async function validateImage(file: File) {
  const rawExtension = file.name.split(".").pop()?.toLowerCase();
  if (!rawExtension || !Object.prototype.hasOwnProperty.call(formats, rawExtension)) throw new Error("Choose a JPG, JPEG, PNG, or WebP image.");
  const extension = rawExtension as keyof typeof formats;
  const format = formats[extension];
  if (file.size <= 0 || file.size > MAX_ITEM_IMAGE_BYTES) throw new Error("Each image must be 5 MB or smaller.");
  if (file.type && file.type.toLowerCase() !== format.mime) throw new Error("The file extension and image type do not match.");

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signatureMatches = format.signature.every((byte, index) => byte === null || bytes[index] === byte);
  if (!signatureMatches) throw new Error("The selected file is not a valid supported image.");
  return { extension, mime: format.mime };
}

export async function uploadItemImages(files: File[]) {
  if (files.length > MAX_ITEM_IMAGES) throw new Error("You can upload up to four photos per item.");

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const { extension, mime } = await validateImage(file);
      const { path } = await uploadImageFile(new File([file], file.name, { type: mime }), extension);
      uploaded.push(path);
    }
    return uploaded;
  } catch (error) {
    await Promise.all(uploaded.map(path => api("/uploads", json("DELETE", { path })).catch(() => undefined)));
    throw error;
  }
}

export async function removeItemImage(path: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !validItemImagePath(path)) throw new Error("Sign in again before removing this photo.");
  await api("/uploads", json("DELETE", { path }));
}

export function getItemImageUrl(path: string) {
  if (!validItemImagePath(path)) return "";
  return supabase.storage.from(ITEM_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

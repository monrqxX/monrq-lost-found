import { supabase } from "./supabase";

const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(`${baseUrl}/api${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body as T;
}

export async function uploadImageFile(file: File, extension: string): Promise<{ path: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in again before uploading photos.");
  const headers = new Headers({
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": file.type,
    "X-Image-Extension": extension,
  });
  const response = await fetch(`${baseUrl}/api/uploads`, { method: "POST", headers, body: file });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Photo upload failed (${response.status})`);
  return body as { path: string };
}

export const json = (method: string, value?: unknown): RequestInit => ({ method, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });

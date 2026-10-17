import React, { createContext, useContext, useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type User = { uid: string; email: string; displayName: string; photoURL?: string };
type Ctx = {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>; reset: (email: string) => Promise<void>; updatePassword: (password: string) => Promise<void>; loginWithGoogle: () => Promise<void>;
};
const C = createContext<Ctx>({} as Ctx);
function fromSupabase(user: SupabaseUser | null): User | null {
  if (!user) return null;
  return { uid: user.id, email: user.email || "", displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User", photoURL: user.user_metadata?.avatar_url };
}
function requireConfigured() { if (!isSupabaseConfigured) throw new Error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local environment first."); }

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data, error }) => { if (!error) setUser(fromSupabase(data.session?.user || null)); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(fromSupabase(session?.user || null)));
    return () => subscription.unsubscribe();
  }, []);
  const login = async (email: string, password: string) => { requireConfigured(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; };
  const register = async (name: string, email: string, password: string) => {
    requireConfigured();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/verify-email` } });
    if (error) throw error;
    return Boolean(data.session);
  };
  const loginWithGoogle = async () => { requireConfigured(); const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/dashboard` } }); if (error) throw error; };
  const logout = async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; };
  const reset = async (email: string) => { requireConfigured(); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` }); if (error) throw error; };
  const updatePassword = async (password: string) => { requireConfigured(); const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; };
  return <C.Provider value={{ user, loading, login, register, logout, reset, updatePassword, loginWithGoogle }}>{children}</C.Provider>;
};
export const useAuth = () => useContext(C);

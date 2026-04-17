/**
 * Real auth backed by Lovable Cloud (Supabase).
 * Tracks the current session, profile, and roles.
 */
import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "manager" | "employee";

export interface AuthProfile {
  id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  company_id: string | null;
  employee_id: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: AppRole;
  roles: AppRole[];
  companyId: string | null;
}

function rankRole(roles: AppRole[]): AppRole {
  const order: AppRole[] = ["super_admin", "admin", "manager", "employee"];
  for (const r of order) if (roles.includes(r)) return r;
  return "employee";
}

async function loadProfileAndRoles(user: User): Promise<AuthUser | null> {
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles" as any).select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles" as any).select("role").eq("user_id", user.id),
  ]);

  const roles: AppRole[] = ((roleRows ?? []) as unknown as Array<{ role: AppRole }>).map((r) => r.role);
  const p = (profile ?? {}) as Partial<AuthProfile>;

  return {
    id: user.id,
    email: user.email ?? p.email ?? "",
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    profileImageUrl: p.profile_image_url ?? null,
    role: rankRole(roles),
    roles,
    companyId: p.company_id ?? null,
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // 1. Set listener FIRST (do not call async supabase fns directly inside callback)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (!newSession?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      // Defer Supabase calls to avoid deadlocks
      setTimeout(() => {
        loadProfileAndRoles(newSession.user).then((u) => {
          if (active) setUser(u);
        });
      }, 0);
    });

    // 2. Then check existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      if (s?.user) {
        const u = await loadProfileAndRoles(s.user);
        if (active) setUser(u);
      }
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return { user, session, isLoading, logout };
}

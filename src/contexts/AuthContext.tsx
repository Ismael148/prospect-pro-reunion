import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Database["public"]["Tables"]["profiles"]["Row"] | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [profileRes, rolesRes, contactsRes] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, avatar_url, created_at, updated_at").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      (supabase as any).rpc("get_team_contacts"),
    ]);

    if (profileRes.data) {
      const ownPhone = Array.isArray(contactsRes?.data)
        ? contactsRes.data.find((c: any) => c.user_id === userId)?.phone ?? null
        : null;
      setProfile({ ...(profileRes.data as any), phone: ownPhone });
    }
    if (rolesRes.data) setRoles(rolesRes.data.map((r) => r.role));
  };


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Ne jamais déconnecter sur un événement transitoire (refresh de token,
        // onglet en arrière-plan, erreur réseau). Seul un SIGNED_OUT explicite
        // ou une suppression de compte vide la session.
        if (!session && event !== "SIGNED_OUT" && event !== "USER_DELETED") {
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, loading, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Commercial {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

export interface ExternalCommercial {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export function useCommercials() {
  return useQuery({
    queryKey: ["commercials"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "commercial_terrain");
      if (rolesError) throw rolesError;
      if (!roles?.length) return [] as Commercial[];

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;
      return (profiles || []) as Commercial[];
    },
  });
}

export function useExternalCommercials() {
  return useQuery({
    queryKey: ["external-commercials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_commercials")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data || []) as ExternalCommercial[];
    },
  });
}

export function useAllCommercials() {
  return useQuery({
    queryKey: ["all-commercials"],
    queryFn: async () => {
      // Internal commercials (with accounts)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "commercial_terrain");
      
      let internal: Commercial[] = [];
      if (roles?.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", roles.map((r) => r.user_id));
        internal = (profiles || []) as Commercial[];
      }

      // External commercials
      const { data: external } = await supabase
        .from("external_commercials")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      return {
        internal,
        external: (external || []) as ExternalCommercial[],
      };
    },
  });
}

export function useSalesTeam() {
  return useQuery({
    queryKey: ["sales-team"],
    queryFn: async () => {
      // Get both agents and commercials
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["agent_telephonique", "agent_master", "commercial_terrain"]);
      if (rolesError) throw rolesError;
      if (!roles?.length) return { agents: [] as Commercial[], commercials: [] as Commercial[], externalCommercials: [] as ExternalCommercial[] };

      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;

      const agentIds = roles.filter((r) => r.role === "agent_telephonique" || r.role === "agent_master").map((r) => r.user_id);
      const commercialIds = roles.filter((r) => r.role === "commercial_terrain").map((r) => r.user_id);

      // External commercials
      const { data: external } = await supabase
        .from("external_commercials")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      return {
        agents: (profiles || []).filter((p) => agentIds.includes(p.user_id)) as Commercial[],
        commercials: (profiles || []).filter((p) => commercialIds.includes(p.user_id)) as Commercial[],
        externalCommercials: (external || []) as ExternalCommercial[],
      };
    },
  });
}

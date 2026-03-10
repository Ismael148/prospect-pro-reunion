import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Commercial {
  user_id: string;
  full_name: string | null;
  phone: string | null;
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

export function useSalesTeam() {
  return useQuery({
    queryKey: ["sales-team"],
    queryFn: async () => {
      // Get both agents and commercials
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["agent_telephonique", "commercial_terrain"]);
      if (rolesError) throw rolesError;
      if (!roles?.length) return { agents: [] as Commercial[], commercials: [] as Commercial[] };

      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;

      const agentIds = roles.filter((r) => r.role === "agent_telephonique").map((r) => r.user_id);
      const commercialIds = roles.filter((r) => r.role === "commercial_terrain").map((r) => r.user_id);

      return {
        agents: (profiles || []).filter((p) => agentIds.includes(p.user_id)) as Commercial[],
        commercials: (profiles || []).filter((p) => commercialIds.includes(p.user_id)) as Commercial[],
      };
    },
  });
}

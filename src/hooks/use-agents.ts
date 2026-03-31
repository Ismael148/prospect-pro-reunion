import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Agent {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      // Get all users with agent_telephonique role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["agent_telephonique", "agent_master"]);
      if (rolesError) throw rolesError;
      if (!roles?.length) return [] as Agent[];

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;
      return (profiles || []) as Agent[];
    },
  });
}

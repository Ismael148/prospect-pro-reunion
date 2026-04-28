import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SeenItemType = "module_note" | "ticket_comment";

export interface SeenMark {
  id: string;
  item_type: SeenItemType;
  item_id: string;
  user_id: string;
  seen_at: string;
}

/**
 * Subscribe to seen marks for a list of item IDs of a given type.
 * Returns a map: item_id -> SeenMark[]
 */
export function useSeenMarks(itemType: SeenItemType, itemIds: string[]) {
  const queryClient = useQueryClient();
  const key = ["seen-marks", itemType, [...itemIds].sort().join(",")];

  useEffect(() => {
    if (!itemIds.length) return;
    const channel = supabase
      .channel(`seen-marks-${itemType}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seen_marks", filter: `item_type=eq.${itemType}` },
        () => queryClient.invalidateQueries({ queryKey: ["seen-marks", itemType] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [itemType, itemIds.join(","), queryClient]);

  return useQuery({
    queryKey: key,
    enabled: itemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seen_marks")
        .select("*")
        .eq("item_type", itemType)
        .in("item_id", itemIds);
      if (error) throw error;
      const map: Record<string, SeenMark[]> = {};
      (data as SeenMark[]).forEach((m) => {
        (map[m.item_id] ||= []).push(m);
      });
      return map;
    },
  });
}

export function useToggleSeenMark() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ itemType, itemId, seen }: { itemType: SeenItemType; itemId: string; seen: boolean }) => {
      if (!user) throw new Error("Non authentifié");
      if (seen) {
        const { error } = await supabase
          .from("seen_marks")
          .delete()
          .eq("item_type", itemType)
          .eq("item_id", itemId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("seen_marks")
          .insert({ item_type: itemType, item_id: itemId, user_id: user.id });
        if (error && !error.message.includes("duplicate")) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["seen-marks", vars.itemType] });
    },
  });
}

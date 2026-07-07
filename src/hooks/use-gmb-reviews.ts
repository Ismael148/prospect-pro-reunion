import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GmbReview {
  id: string;
  client_id: string;
  client_gmb_id: string | null;
  author_name: string;
  rating: number;
  review_text: string | null;
  received_at: string;
  replied_at: string | null;
  status: "nouveau" | "en_cours" | "repondu" | "ignore";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GmbReviewReply {
  id: string;
  review_id: string;
  client_id: string;
  content: string;
  tone: string | null;
  formality: string | null;
  length: string | null;
  is_final: boolean;
  generated_by: string | null;
  created_at: string;
}

export function useGmbReviews(clientId: string) {
  return useQuery({
    queryKey: ["gmb-reviews", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gmb_reviews")
        .select("*")
        .eq("client_id", clientId)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return data as GmbReview[];
    },
    enabled: !!clientId,
  });
}

export function useGmbReviewReplies(reviewId: string | null) {
  return useQuery({
    queryKey: ["gmb-review-replies", reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gmb_review_replies")
        .select("*")
        .eq("review_id", reviewId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GmbReviewReply[];
    },
    enabled: !!reviewId,
  });
}

export function useCreateGmbReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      client_gmb_id?: string | null;
      author_name: string;
      rating: number;
      review_text?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("gmb_reviews")
        .insert({
          ...input,
          created_by: userData.user?.id ?? null,
          status: "nouveau",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as GmbReview;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["gmb-reviews", r.client_id] });
      qc.invalidateQueries({ queryKey: ["client-gmb"] });
      toast.success("Avis enregistré ✅");
    },
    onError: (e: any) => toast.error(e.message || "Erreur enregistrement avis"),
  });
}

export function useUpdateGmbReviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, client_id }: { id: string; status: GmbReview["status"]; client_id: string }) => {
      const { error } = await supabase
        .from("gmb_reviews")
        .update({
          status,
          replied_at: status === "repondu" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
      return { client_id };
    },
    onSuccess: ({ client_id }) => {
      qc.invalidateQueries({ queryKey: ["gmb-reviews", client_id] });
    },
  });
}

export function useDeleteGmbReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase.from("gmb_reviews").delete().eq("id", id);
      if (error) throw error;
      return { client_id };
    },
    onSuccess: ({ client_id }) => {
      qc.invalidateQueries({ queryKey: ["gmb-reviews", client_id] });
      toast.success("Avis supprimé");
    },
    onError: (e: any) => toast.error(e.message || "Erreur suppression"),
  });
}

export function useSaveGmbReviewReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      review_id: string;
      client_id: string;
      content: string;
      tone?: string;
      formality?: string;
      length?: string;
      is_final?: boolean;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("gmb_review_replies")
        .insert({
          ...input,
          generated_by: userData.user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as GmbReviewReply;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["gmb-review-replies", r.review_id] });
    },
  });
}

export function useMarkReplyAsFinal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reply_id, review_id, client_id }: { reply_id: string; review_id: string; client_id: string }) => {
      // Un seul "final" par review
      await supabase.from("gmb_review_replies").update({ is_final: false }).eq("review_id", review_id);
      const { error } = await supabase.from("gmb_review_replies").update({ is_final: true }).eq("id", reply_id);
      if (error) throw error;
      await supabase
        .from("gmb_reviews")
        .update({ status: "repondu", replied_at: new Date().toISOString() })
        .eq("id", review_id);
      return { review_id, client_id };
    },
    onSuccess: ({ review_id, client_id }) => {
      qc.invalidateQueries({ queryKey: ["gmb-review-replies", review_id] });
      qc.invalidateQueries({ queryKey: ["gmb-reviews", client_id] });
      toast.success("Réponse marquée comme publiée sur Google ✅");
    },
  });
}

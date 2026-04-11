import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePageLastEditor(pageId: string | null) {
  return useQuery({
    queryKey: ["page-last-editor", pageId],
    enabled: !!pageId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("user_name, created_at")
        .eq("action", "page_updated")
        .filter("metadata->>page_id", "eq", pageId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return null;
      return { editorName: data.user_name, editedAt: data.created_at };
    },
  });
}

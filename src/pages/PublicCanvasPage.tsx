import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import CanvasPageView from "@/components/canvas/CanvasPageView";

export default function PublicCanvasPage() {
  const { token, pageSlug } = useParams<{ token: string; pageSlug?: string }>();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroup() {
      if (!token) { setError("Link không hợp lệ."); setLoading(false); return; }
      
      const { data, error: fetchError } = await supabase
        .from("groups")
        .select("id, slug, is_public")
        .or(`share_token.eq.${token},slug.eq.${token}`)
        .eq("is_public", true)
        .single();

      if (fetchError || !data) {
        setError("Không tìm thấy dự án hoặc dự án không công khai.");
        setLoading(false);
        return;
      }

      setGroupId(data.id);
      setProjectSlug(data.slug);
      setLoading(false);
    }
    fetchGroup();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !groupId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground gap-3">
        <p className="text-lg font-medium">Không thể truy cập</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <CanvasPageView
        groupId={groupId}
        editable={false}
        projectSlug={projectSlug ?? undefined}
      />
    </div>
  );
}

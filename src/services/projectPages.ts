import { supabase } from "@/integrations/supabase/client";

export async function fetchPagesByGroupId(groupId: string) {
  const { data, error } = await supabase
    .from("project_pages")
    .select("*")
    .eq("group_id", groupId)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createPage(page: {
  group_id: string;
  title: string;
  content: any;
  created_by: string;
  display_order?: number;
  icon?: string | null;
}) {
  const { data, error } = await supabase
    .from("project_pages")
    .insert({
      group_id: page.group_id,
      title: page.title,
      content: page.content,
      created_by: page.created_by,
      display_order: page.display_order ?? 0,
      icon: page.icon ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePageContent(pageId: string, content: any) {
  const { data, error } = await supabase
    .from("project_pages")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePage(pageId: string, updates: {
  title?: string;
  content?: any;
  display_order?: number;
  icon?: string | null;
}) {
  const { data, error } = await supabase
    .from("project_pages")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePage(pageId: string) {
  const { error } = await supabase
    .from("project_pages")
    .delete()
    .eq("id", pageId);

  if (error) throw error;
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: Json;
  workspaceId?: string;
  defaultName?: string;
}

const CATEGORIES = [
  { value: "general", label: "Chung" },
  { value: "project-management", label: "Quản lý dự án" },
  { value: "meetings", label: "Cuộc họp" },
  { value: "research", label: "Nghiên cứu" },
  { value: "education", label: "Giáo dục" },
];

export default function SaveAsTemplateDialog({
  open,
  onOpenChange,
  content,
  workspaceId,
  defaultName = "",
}: SaveAsTemplateDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("project_templates").insert({
        name: name.trim(),
        description: description.trim() || null,
        content,
        category,
        created_by: user.id,
        workspace_id: workspaceId || null,
      });
      if (error) throw error;
      toast.success("Đã lưu template thành công!");
      onOpenChange(false);
      setName("");
      setDescription("");
      setCategory("general");
    } catch (err: any) {
      toast.error(err.message || "Không thể lưu template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lưu làm Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Tên template *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên template..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-desc">Mô tả</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn (tuỳ chọn)"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {saving ? "Đang lưu..." : "Lưu template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

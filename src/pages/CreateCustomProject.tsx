import { useState, Suspense, lazy, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Json } from "@/integrations/supabase/types";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createPage } from "@/services/projectPages";
import { ArrowLeft, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Block } from "@blocknote/core";

const CanvasEditor = lazy(() => import("@/components/canvas/CanvasEditor"));
import TemplatePicker from "@/components/canvas/TemplatePicker";

export default function CreateCustomProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaces, activeWorkspace, isLoading: wsLoading } = useWorkspace();
  const [searchParams] = useSearchParams();
  const workspaceFromUrl = searchParams.get("workspace");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    workspaceFromUrl || activeWorkspace?.id || ""
  );
  const [isCreating, setIsCreating] = useState(false);
  const [templateContent, setTemplateContent] = useState<Json | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const editorContentRef = useRef<Block[]>([]);
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const createLockRef = useRef(false);
  const editorKey = useRef(0);

  // Step: 'template' or 'details'
  const [step, setStep] = useState<'template' | 'details'>('template');

  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length === 1) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const nameError = projectName.trim().length > 0 && projectName.trim().length < 2
    ? "Tên project phải có ít nhất 2 ký tự"
    : null;

  const canCreate = projectName.trim().length >= 2 && selectedWorkspaceId && !isCreating && !nameError;

  const handleCreate = useCallback(async () => {
    if (!user || !canCreate || createLockRef.current) return;
    createLockRef.current = true;
    setIsCreating(true);

    try {
      const { data: newGroup, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: projectName.trim(),
          description: description.trim() || null,
          created_by: user.id,
          workspace_id: selectedWorkspaceId,
          project_mode: "custom",
          slug: "",
          idempotency_key: idempotencyKeyRef.current,
        })
        .select()
        .single();

      if (groupError) {
        if (groupError.code === "23505" && groupError.message?.includes("idempotency_key")) {
          toast.info("Project này đã được tạo trước đó.");
          navigate("/dashboard");
          return;
        }
        throw groupError;
      }

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: newGroup.id,
          user_id: user.id,
          role: "project_admin" as any,
        });
      if (memberError) throw memberError;

      await createPage({
        group_id: newGroup.id,
        title: "Untitled Page",
        content: editorContentRef.current.length > 0 ? editorContentRef.current : [{ type: "paragraph", content: [] }],
        created_by: user.id,
        display_order: 0,
      });

      toast.success("Tạo project thành công!");
      // Navigate using slug for clean URL
      const slug = newGroup.slug || newGroup.id;
      navigate(`/p/${slug}`);
    } catch (error: any) {
      console.error("Create project error:", error);
      toast.error(error.message || "Không thể tạo project");
      createLockRef.current = false;
    } finally {
      setIsCreating(false);
    }
  }, [user, canCreate, projectName, description, selectedWorkspaceId, navigate]);

  const handleSelectTemplate = (content: Json | null, templateId: string | null) => {
    setTemplateContent(content);
    setSelectedTemplateId(templateId);
    editorContentRef.current = [];
    editorKey.current += 1;
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
                Tạo dự án Custom
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 'template' ? 'Chọn template để bắt đầu' : 'Điền thông tin dự án'}
              </p>
            </div>
            {/* Step indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${step === 'template' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>1</span>
              <span className={step === 'template' ? 'text-foreground font-medium' : 'text-muted-foreground'}>Template</span>
              <span className="text-muted-foreground/40 mx-1">—</span>
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${step === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span>
              <span className={step === 'details' ? 'text-foreground font-medium' : 'text-muted-foreground'}>Chi tiết</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Template Selection */}
      {step === 'template' && (
        <div className="flex-1 container max-w-5xl mx-auto px-4 py-8">
          <TemplatePicker
            workspaceId={selectedWorkspaceId}
            onSelect={(content, templateId) => {
              handleSelectTemplate(content, templateId);
              setStep('details');
            }}
            selectedTemplateId={selectedTemplateId}
          />
        </div>
      )}

      {/* Step 2: Project Details + Editor Preview */}
      {step === 'details' && (
        <div className="flex-1 container max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            {/* Left: Form */}
            <div className="space-y-5">
              <button
                onClick={() => setStep('template')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Chọn template khác
              </button>

              <div className="space-y-2">
                <Label>Workspace</Label>
                {wsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                  </div>
                ) : (
                  <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectName">Tên dự án *</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Nhập tên dự án..."
                  autoFocus
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn (tuỳ chọn)"
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button disabled={!canCreate} onClick={handleCreate} className="w-full">
                  {isCreating ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1.5 h-4 w-4" />
                  )}
                  {isCreating ? "Đang tạo..." : "Tạo dự án"}
                </Button>
              </div>
            </div>

            {/* Right: Editor Preview */}
            <div className="border rounded-xl min-h-[460px] bg-background overflow-hidden shadow-sm">
              <div className="px-3 py-2 border-b bg-muted/30 text-xs text-muted-foreground font-medium">
                Xem trước nội dung
              </div>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Đang tải editor...
                  </div>
                }
              >
                <CanvasEditor
                  key={editorKey.current}
                  initialContent={templateContent ? (templateContent as any) : undefined}
                  editable={!isCreating}
                  onChange={(content) => {
                    editorContentRef.current = content;
                  }}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

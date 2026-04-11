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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createPage } from "@/services/projectPages";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Block } from "@blocknote/core";

const CanvasEditor = lazy(() => import("@/components/canvas/CanvasEditor"));

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
  const editorContentRef = useRef<Block[]>([]);
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const createLockRef = useRef(false);

  // Auto-select workspace if only one available
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
        // Handle duplicate idempotency_key
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
      navigate(`/projects/${newGroup.id}`);
    } catch (error: any) {
      console.error("Create project error:", error);
      toast.error(error.message || "Không thể tạo project");
      createLockRef.current = false;
    } finally {
      setIsCreating(false);
    }
  }, [user, canCreate, projectName, description, selectedWorkspaceId, navigate]);

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Create Custom Project</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Create Custom Project
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up a new project with a block-based canvas
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Workspace</Label>
            {wsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <Select
                value={selectedWorkspaceId}
                onValueChange={setSelectedWorkspaceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description (optional)"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button disabled={!canCreate} onClick={handleCreate}>
              {isCreating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              {isCreating ? "Creating..." : "Create Project"}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </div>

        <div className="border rounded-lg min-h-[500px] bg-background overflow-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading editor...
              </div>
            }
          >
            <CanvasEditor
              editable={!isCreating}
              onChange={(content) => {
                editorContentRef.current = content;
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

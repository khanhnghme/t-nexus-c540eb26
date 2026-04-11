import { useState, Suspense, lazy, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import type { Block } from "@blocknote/core";

const CanvasEditor = lazy(() => import("@/components/canvas/CanvasEditor"));

export default function CreateCustomProject() {
  const navigate = useNavigate();
  const { workspaces, activeWorkspace, isLoading: wsLoading } = useWorkspace();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    activeWorkspace?.id ?? ""
  );
  const editorContentRef = useRef<Block[]>([]);

  const canCreate = projectName.trim().length > 0 && selectedWorkspaceId;

  const handleCreate = () => {
    const payload = {
      name: projectName.trim(),
      workspace_id: selectedWorkspaceId,
      description: description.trim() || null,
      content: editorContentRef.current,
    };
    console.log("[CreateCustomProject] payload ready for Phase 2:", payload);
  };

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Breadcrumb */}
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

      {/* Header */}
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

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left sidebar — metadata */}
        <div className="space-y-5">
          {/* Workspace selector */}
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

          {/* Project name */}
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
            />
          </div>

          {/* Description */}
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

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button disabled={!canCreate} onClick={handleCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Create Project
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </div>

        {/* Right — editor */}
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
              editable={true}
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

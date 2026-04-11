import { useState, Suspense, lazy } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CanvasEditor = lazy(() => import("@/components/canvas/CanvasEditor"));

export default function CreateCustomProject() {
  const [projectName, setProjectName] = useState("");

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Create Custom Project
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test page — Canvas Editor preview
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectName">Project Name</Label>
        <Input
          id="projectName"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Enter project name..."
        />
      </div>

      <div className="border rounded-lg min-h-[400px] bg-background">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              Loading editor...
            </div>
          }
        >
          <CanvasEditor
            editable={true}
            onChange={(content) => {
              console.log("[CanvasEditor] content changed:", content.length, "blocks");
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

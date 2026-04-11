import { Skeleton } from "@/components/ui/skeleton";

interface BlockSkeletonProps {
  variant?: "list" | "members" | "calendar" | "default";
  rows?: number;
}

export default function BlockSkeleton({ variant = "default", rows = 3 }: BlockSkeletonProps) {
  if (variant === "members") {
    return (
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "calendar") {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

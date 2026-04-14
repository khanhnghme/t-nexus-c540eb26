import React from "react";
import { cn } from "@/lib/utils";
import { LottiePlayer } from "./lottie-player";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  animationData?: Record<string, unknown>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  animationData,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in",
        className,
      )}
    >
      {animationData ? (
        <LottiePlayer
          animationData={animationData}
          loop={false}
          className="w-[120px] h-[120px] mb-4"
        />
      ) : Icon ? (
        <div className="mb-4 rounded-xl bg-muted p-4">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      ) : null}

      <h4 className="text-heading-3 text-foreground mb-1">{title}</h4>

      {description && (
        <p className="text-body-sm text-muted-foreground max-w-xs">{description}</p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

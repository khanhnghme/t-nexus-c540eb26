import React from "react";
import { cn } from "@/lib/utils";
import { LottiePlayer } from "./lottie-player";

interface LoadingAnimationProps {
  animationData?: Record<string, unknown>;
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeMap = { sm: 32, md: 64, lg: 120 } as const;

export function LoadingAnimation({
  animationData,
  size = "md",
  text,
  className,
}: LoadingAnimationProps) {
  const px = sizeMap[size];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      {animationData ? (
        <LottiePlayer
          animationData={animationData}
          loop
          className="mx-auto"
        />
      ) : (
        <div className="flex items-center gap-1.5" style={{ height: px }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block rounded-full bg-muted-foreground/40"
              style={{
                width: Math.max(px / 6, 6),
                height: Math.max(px / 6, 6),
                animation: `bounce-in 0.6s ease-in-out ${i * 120}ms infinite`,
              }}
            />
          ))}
        </div>
      )}

      {text && (
        <span className="text-body-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

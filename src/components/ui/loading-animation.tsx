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
          className={`w-[${px}px] h-[${px}px]`}
          style-width={px}
        />
      ) : (
        <div className="flex items-center gap-1.5" style={{ height: px }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block rounded-full bg-muted-foreground/40 animate-bounce-in"
              style={{
                width: Math.max(px / 6, 6),
                height: Math.max(px / 6, 6),
                animationDelay: `${i * 120}ms`,
                animationIterationCount: "infinite",
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

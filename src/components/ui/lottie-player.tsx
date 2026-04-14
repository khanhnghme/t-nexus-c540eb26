import React, { Suspense } from "react";
import { cn } from "@/lib/utils";

const LottieReact = React.lazy(() => import("lottie-react"));

interface LottiePlayerProps {
  animationData: Record<string, unknown>;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  speed?: number;
}

export function LottiePlayer({
  animationData,
  loop = true,
  autoplay = true,
  className,
  speed = 1,
}: LottiePlayerProps) {
  return (
    <Suspense
      fallback={
        <div className={cn("animate-pulse-soft rounded-md bg-muted", className)} />
      }
    >
      <LottieReact
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        className={className}
        speed={speed}
      />
    </Suspense>
  );
}

import React, { Suspense, useRef, useEffect } from "react";
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
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    if (lottieRef.current && speed !== 1) {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed]);

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
        lottieRef={lottieRef}
      />
    </Suspense>
  );
}

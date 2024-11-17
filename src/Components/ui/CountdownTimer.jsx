import React, { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CountdownTimer = ({
  duration = 15,
  isPlaying = true,
  onComplete = () => {},
  size = "lg",
}) => {
  const [remainingTime, setRemainingTime] = useState(duration);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, onComplete]);

  useEffect(() => {
    setProgress((remainingTime / duration) * 100);
  }, [remainingTime, duration]);

  const getTimerColor = () => {
    if (remainingTime > 10) return "text-green-500";
    if (remainingTime > 5) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressColor = () => {
    if (remainingTime > 10) return "bg-green-500";
    if (remainingTime > 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center font-bold transition-colors",
          getTimerColor(),
          size === "lg" ? "text-3xl w-16 h-16" : "text-xl w-12 h-12"
        )}
      >
        {remainingTime}
      </div>
      <Progress
        value={progress}
        className={cn(
          "w-24 h-2 mt-2 transition-all",
          size === "lg" ? "w-24" : "w-16"
        )}
        indicatorClassName={cn("transition-all", getProgressColor())}
      />
    </div>
  );
};

export default CountdownTimer;

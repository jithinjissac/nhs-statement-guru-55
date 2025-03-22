
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  status: string;
  progress: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ status, progress }) => {
  // Determine color based on progress
  const getColorClass = () => {
    if (progress < 30) return "bg-blue-500";
    if (progress < 50) return "bg-cyan-500"; 
    if (progress < 70) return "bg-yellow-500";
    if (progress < 90) return "bg-orange-500";
    return "bg-green-500";
  };
  
  // Subtle animation for in-progress status with varying intensity
  const getAnimationClass = () => {
    if (progress < 100) {
      if (progress < 50) return "animate-pulse";
      if (progress < 80) return "animate-pulse duration-1000";
      return "animate-pulse duration-1500";
    }
    return "";
  };
  
  return (
    <div className="space-y-3 bg-secondary/20 p-4 rounded-lg border border-secondary/50">
      <div className="flex justify-between text-sm mb-1">
        <span className={cn("font-medium", progress < 100 ? getAnimationClass() : "")}>{status}</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <Progress 
        value={progress} 
        className="h-3 bg-secondary/30" 
        indicatorClassName={cn(getColorClass(), "transition-all duration-700")}
      />
      {progress < 100 && (
        <p className="text-xs text-muted-foreground italic">
          {progress < 20 ? "Starting analysis process..." :
           progress < 40 ? "AI model is analyzing your documents..." : 
           progress < 60 ? "Matching job requirements to your CV..." : 
           progress < 80 ? "Processing skills and qualifications..." : 
           "Finalizing analysis results..."}
        </p>
      )}
    </div>
  );
};

export default ProgressIndicator;

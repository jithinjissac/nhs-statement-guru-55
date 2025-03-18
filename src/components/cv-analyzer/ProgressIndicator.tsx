
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  status: string;
  progress: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ status, progress }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm mb-1">
        <span>{status}</span>
        <span>{progress}%</span>
      </div>
      <Progress 
        value={progress} 
        className="h-2" 
        indicatorClassName={progress === 100 ? "bg-green-500" : ""}
      />
    </div>
  );
};

export default ProgressIndicator;

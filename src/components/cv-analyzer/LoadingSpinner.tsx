
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message: string;
  status?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, status }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">{message}</p>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
};

export default LoadingSpinner;


import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="rounded-full bg-amber-100 p-4 mb-6 dark:bg-amber-900/30">
        <AlertTriangle className="h-12 w-12 text-amber-600 dark:text-amber-300" />
      </div>
      
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
        Access Denied
      </h1>
      
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="outline">
          <Link to="/">Go to Home</Link>
        </Button>
        
        <Button asChild>
          <Link to="/contact">Contact Support</Link>
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;

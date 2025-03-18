
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Download, Pencil } from 'lucide-react';

interface TailoredStatementProps {
  statement: string;
  onChange: (value: string) => void;
  onSubmit: (statement: string) => void;
}

const TailoredStatement: React.FC<TailoredStatementProps> = ({
  statement,
  onChange,
  onSubmit
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          2
        </div>
        <div className="space-y-4 w-full">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Your Tailored Statement</h3>
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900/40 dark:text-blue-300">
              Enhanced with NHS Guidelines
            </span>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">
                This statement has been tailored to your CV and the job description, incorporating NHS values and best practices. 
                Feel free to edit it to make it more personal.
              </p>
              
              <div className="flex items-center gap-2 mb-3">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Edit Your Statement</p>
              </div>
          
              <Textarea
                value={statement}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[350px] font-medium leading-relaxed"
                placeholder="Your tailored statement will appear here..."
              />
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={() => onSubmit(statement)}>
              <Download className="h-4 w-4 mr-2" />
              Use This Statement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailoredStatement;


import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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
          <h3 className="text-lg font-medium">Tailored Statement</h3>
          
          <Textarea
            value={statement}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[300px] font-medium"
          />
          
          <div className="flex justify-end">
            <Button onClick={() => onSubmit(statement)}>
              Use This Statement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailoredStatement;

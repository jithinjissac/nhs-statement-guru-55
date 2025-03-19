
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Download, Pencil, InfoIcon, ClipboardCheck } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

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
  // Calculate word count
  const wordCount = statement.trim() ? statement.trim().split(/\s+/).length : 0;
  const charCount = statement.length;
  
  // Recommended limits for NHS supporting statements
  const idealWordCount = { min: 500, max: 800 };
  const maxCharLimit = 4000;
  
  // Calculate status for word count
  const getWordCountStatus = () => {
    if (wordCount < idealWordCount.min) return "text-yellow-500";
    if (wordCount > idealWordCount.max) return "text-yellow-500";
    return "text-green-500";
  };
  
  // Calculate status for character count
  const getCharCountStatus = () => {
    if (charCount > maxCharLimit) return "text-red-500";
    if (charCount > maxCharLimit * 0.9) return "text-yellow-500";
    return "text-green-500";
  };
  
  // Copy statement to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(statement)
      .then(() => toast.success("Statement copied to clipboard"))
      .catch(() => toast.error("Failed to copy statement"));
  };

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
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="ml-auto flex items-center cursor-help">
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-md p-4">
                  <h4 className="font-medium mb-1">NHS Supporting Statement Tips:</h4>
                  <ul className="text-xs list-disc pl-4 space-y-1">
                    <li>Address all criteria from the person specification</li>
                    <li>Provide specific examples using the STAR method (Situation, Task, Action, Result)</li>
                    <li>Demonstrate NHS values: respect, dignity, compassion, quality of care</li>
                    <li>Aim for 500-800 words with clear paragraphs</li>
                    <li>Proofread for clarity, spelling and grammar</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">
                This statement has been tailored to your CV and the job description, incorporating NHS values and best practices. 
                Feel free to edit it to make it more personal.
              </p>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Edit Your Statement</p>
                </div>
                
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <ClipboardCheck className="h-3 w-3" />
                  Copy
                </button>
              </div>
          
              <Textarea
                value={statement}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[350px] font-medium leading-relaxed"
                placeholder="Your tailored statement will appear here..."
              />
              
              <div className="flex justify-between mt-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={getWordCountStatus()}>
                    {wordCount} words
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className={getCharCountStatus()}>
                    {charCount} characters
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Target: {idealWordCount.min}-{idealWordCount.max} words
                </div>
              </div>
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

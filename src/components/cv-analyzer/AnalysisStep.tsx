
import React from 'react';
import { Button } from '@/components/ui/button';
import { CVAnalysisResult } from '@/services/AIService';
import CVSummary from './CVSummary';
import JobSummary from './JobSummary';
import RequirementsTable from './RequirementsTable';
import Recommendations from './Recommendations';
import { Loader2 } from 'lucide-react';

interface AnalysisStepProps {
  analysis: CVAnalysisResult;
  unmatchedResponses: Record<string, string>;
  onUnmatchedResponse: (requirement: string, response: string) => void;
  onGenerateStatement: () => void;
  isGenerating: boolean;
}

const AnalysisStep: React.FC<AnalysisStepProps> = ({
  analysis,
  unmatchedResponses,
  onUnmatchedResponse,
  onGenerateStatement,
  isGenerating
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          1
        </div>
        <div className="space-y-6 w-full">
          <h3 className="text-lg font-medium">Analysis Results</h3>
          
          <CVSummary analysis={analysis} />
          <JobSummary analysis={analysis} />
          <RequirementsTable 
            analysis={analysis} 
            unmatchedResponses={unmatchedResponses} 
            onUnmatchedResponse={onUnmatchedResponse} 
          />
          <Recommendations analysis={analysis} />
          
          <div className="flex justify-end">
            <Button
              onClick={onGenerateStatement}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate Tailored Statement</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisStep;

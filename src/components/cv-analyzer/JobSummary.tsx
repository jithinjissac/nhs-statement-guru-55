
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CVAnalysisResult } from '@/services/AIService';

interface JobSummaryProps {
  analysis: CVAnalysisResult;
}

const JobSummary: React.FC<JobSummaryProps> = ({ analysis }) => {
  return (
    <Card className="border border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Job Description Summary</CardTitle>
        <CardDescription>
          Key elements from the job description
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* NHS Values Section */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium">NHS Values Identified</h5>
          <div className="flex flex-wrap gap-2">
            {analysis.nhsValues.length > 0 ? (
              analysis.nhsValues.map((value, index) => (
                <Badge key={index} variant="default" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {value}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No specific NHS values detected in the job description</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobSummary;

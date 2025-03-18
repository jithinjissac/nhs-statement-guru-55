import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { CVAnalysisResult } from '@/services/ai/types';

interface RequirementsTableProps {
  analysis: CVAnalysisResult;
  unmatchedResponses: Record<string, string>;
  onUnmatchedResponse: (requirement: string, response: string) => void;
}

const RequirementsTable: React.FC<RequirementsTableProps> = ({ 
  analysis, 
  unmatchedResponses, 
  onUnmatchedResponse 
}) => {
  // Helper function to render requirement text with appropriate styling
  const renderRequirementText = (text: string) => {
    const match = text.match(/^\[(Essential|Desirable)\]\s*/i);
    if (match) {
      const tag = match[0];
      const isEssential = tag.toLowerCase().includes('essential');
      const tagClass = isEssential ? 
        'text-red-600 dark:text-red-400 font-medium' : 
        'text-amber-600 dark:text-amber-400';
      const remainingText = text.substring(tag.length);
      
      return (
        <>
          <span className={tagClass}>{tag}</span>
          {remainingText}
        </>
      );
    }
    return text;
  };

  return (
    <Card className="border border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Requirements Comparison</CardTitle>
        <CardDescription>
          Based on Person Specification from job description
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(analysis.matchedRequirements.length > 0 || analysis.missingRequirements.length > 0) ? (
          <ScrollArea className="h-[400px] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Requirement</TableHead>
                  <TableHead className="w-[50%]">Evidence</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.matchedRequirements.map((req, index) => (
                  <TableRow key={`matched-${index}`}>
                    <TableCell className="align-top">
                      {renderRequirementText(req.requirement)}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      <span>{req.evidence}</span>
                      {req.keywords && req.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {req.keywords.map((keyword, kidx) => (
                            <Badge key={kidx} variant="outline" className="bg-blue-50 text-blue-600 text-xs dark:bg-blue-900/20 dark:text-blue-300">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-green-600 dark:text-green-400 whitespace-nowrap">Matched</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {analysis.missingRequirements.map((req, index) => (
                  <TableRow key={`missing-${index}`}>
                    <TableCell className="align-top">
                      {renderRequirementText(req)}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          No matching evidence found in your CV
                        </p>
                        <div className="space-y-1">
                          <FormLabel className="text-xs">Do you meet this requirement?</FormLabel>
                          <Textarea 
                            placeholder="Explain how you meet this requirement..."
                            value={unmatchedResponses[req] || ''}
                            onChange={(e) => onUnmatchedResponse(req, e.target.value)}
                            className="text-sm min-h-[60px]"
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                        <span className="text-amber-600 dark:text-amber-400 whitespace-nowrap">Missing</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No specific requirements detected in the job description</p>
        )}
      </CardContent>
    </Card>
  );
};

export default RequirementsTable;

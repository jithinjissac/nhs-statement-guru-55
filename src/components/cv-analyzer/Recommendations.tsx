
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { CVAnalysisResult } from '@/services/ai/types';

interface RecommendationsProps {
  analysis: CVAnalysisResult;
}

const Recommendations: React.FC<RecommendationsProps> = ({ analysis }) => {
  // NHS-specific best practices for supporting statements
  const nhsBestPractices = [
    "Address each criterion in the person specification with specific examples",
    "Use the STAR method (Situation, Task, Action, Result) for your examples",
    "Demonstrate how you embody the NHS values in your work",
    "Keep your statement between 500-800 words for readability",
    "Structure with a clear introduction, main body, and conclusion"
  ];

  return (
    <Card className="border border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* CV-specific recommendations */}
          {analysis.recommendedHighlights.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium mb-2">Based on your CV analysis:</h4>
              <ul className="text-sm space-y-2">
                {analysis.recommendedHighlights.map((rec, index) => (
                  <li key={index} className="flex">
                    <ArrowRight className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No specific recommendations available</p>
          )}
          
          {/* NHS best practices */}
          <div>
            <h4 className="text-sm font-medium mb-2">NHS Supporting Statement Best Practices:</h4>
            <ul className="text-sm space-y-2">
              {nhsBestPractices.map((practice, index) => (
                <li key={index} className="flex">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{practice}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Recommendations;

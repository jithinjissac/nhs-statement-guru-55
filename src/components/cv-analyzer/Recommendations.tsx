
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { CVAnalysisResult } from '@/services/ai/types';

interface RecommendationsProps {
  analysis: CVAnalysisResult;
}

const Recommendations: React.FC<RecommendationsProps> = ({ analysis }) => {
  return (
    <Card className="border border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        {analysis.recommendedHighlights.length > 0 ? (
          <ul className="text-sm space-y-2">
            {analysis.recommendedHighlights.map((rec, index) => (
              <li key={index} className="flex">
                <ArrowRight className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No specific recommendations available</p>
        )}
      </CardContent>
    </Card>
  );
};

export default Recommendations;

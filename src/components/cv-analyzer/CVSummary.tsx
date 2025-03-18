import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Briefcase } from 'lucide-react';
import { CVAnalysisResult } from '@/services/ai/types';

interface CVSummaryProps {
  analysis: CVAnalysisResult;
}

const CVSummary: React.FC<CVSummaryProps> = ({ analysis }) => {
  return (
    <Card className="border border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">CV Summary</CardTitle>
        {analysis.relevantExperience.yearsOfExperience > 0 && (
          <CardDescription>
            {analysis.relevantExperience.yearsOfExperience} {analysis.relevantExperience.yearsOfExperience === 1 ? 'year' : 'years'} of experience identified
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Relevant Skills</h5>
          <div className="flex flex-wrap gap-2">
            {analysis.relevantSkills.length > 0 ? (
              analysis.relevantSkills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No specific skills detected in your CV</p>
            )}
          </div>
        </div>
        
        {/* Education Section */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Education & Qualifications
          </h5>
          {analysis.education && analysis.education.length > 0 ? (
            <ul className="text-sm space-y-1 list-disc pl-5">
              {analysis.education.map((edu, index) => (
                <li key={index}>{edu}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific education details detected in your CV</p>
          )}
        </div>
        
        <div className="space-y-2">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-500" />
            Clinical Experience
          </h5>
          {analysis.relevantExperience.clinical.length > 0 ? (
            <ul className="text-sm space-y-1 list-disc pl-5">
              {analysis.relevantExperience.clinical.map((exp, index) => (
                <li key={index}>{exp}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No clinical experience detected in your CV</p>
          )}
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-500" />
            Administrative Experience
          </h5>
          {analysis.relevantExperience.administrative?.length > 0 ? (
            <ul className="text-sm space-y-1 list-disc pl-5">
              {analysis.relevantExperience.administrative.map((exp, index) => (
                <li key={index}>{exp}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No administrative experience detected in your CV</p>
          )}
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-500" />
            Other Non-Clinical Experience
          </h5>
          {analysis.relevantExperience.nonClinical.length > 0 ? (
            <ul className="text-sm space-y-1 list-disc pl-5">
              {analysis.relevantExperience.nonClinical.map((exp, index) => (
                <li key={index}>{exp}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No other non-clinical experience detected in your CV</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CVSummary;

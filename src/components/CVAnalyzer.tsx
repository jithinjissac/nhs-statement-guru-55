
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIService, CVAnalysisResult } from '@/services/AIService';
import { toast } from 'sonner';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface CVAnalyzerProps {
  cv: string;
  jobDescription: string;
  onStatementGenerated: (statement: string) => void;
}

const CVAnalyzer: React.FC<CVAnalyzerProps> = ({ cv, jobDescription, onStatementGenerated }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<CVAnalysisResult | null>(null);
  const [tailoredStatement, setTailoredStatement] = useState('');
  const [writingStyle, setWritingStyle] = useState<'simple' | 'moderate' | 'advanced'>('moderate');
  const [activeStep, setActiveStep] = useState(1);

  // Analyze CV automatically when component loads if CV and job description are available
  React.useEffect(() => {
    if (cv && jobDescription && !analysis) {
      analyzeCV();
    }
  }, [cv, jobDescription]);

  const analyzeCV = async () => {
    if (!cv || !jobDescription) {
      toast.error('Please upload both your CV and the job description first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await AIService.analyzeCV(cv, jobDescription);
      setAnalysis(result);
      setActiveStep(2);
      toast.success('CV analysis completed successfully');
    } catch (error) {
      console.error('Error analyzing CV:', error);
      toast.error('Failed to analyze CV. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateTailoredStatement = async () => {
    if (!cv || !jobDescription) {
      toast.error('Please upload both your CV and the job description first');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await AIService.generateTailoredStatement(
        cv,
        jobDescription,
        '', // No additional experiences needed as we're using extracted data
        writingStyle
      );
      
      setTailoredStatement(result.statement);
      if (!analysis) {
        setAnalysis(result.analysis);
      }
      
      setActiveStep(3);
      toast.success('Tailored statement generated successfully');
      onStatementGenerated(result.statement);
    } catch (error) {
      console.error('Error generating statement:', error);
      toast.error('Failed to generate statement. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CV Analysis & Statement Generation</CardTitle>
          <CardDescription>
            Analysis results based on your CV and job description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Analysis in Progress */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Analyzing your CV against job requirements...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            )}
            
            {/* Step 1: CV & JD Analysis with Comparison Table */}
            {!isAnalyzing && analysis && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    1
                  </div>
                  <div className="space-y-6 w-full">
                    <h3 className="text-lg font-medium">Analysis Results</h3>
                    
                    {/* CV Summary Section */}
                    <Card className="border border-muted">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">CV Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Relevant Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {analysis.relevantSkills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Clinical Experience</h5>
                          <ul className="text-sm space-y-1 list-disc pl-5">
                            {analysis.relevantExperience.clinical.map((exp, index) => (
                              <li key={index}>{exp}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Non-Clinical Experience</h5>
                          <ul className="text-sm space-y-1 list-disc pl-5">
                            {analysis.relevantExperience.nonClinical.map((exp, index) => (
                              <li key={index}>{exp}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Requirements Comparison Table */}
                    <Card className="border border-muted">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Requirements Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Requirement</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analysis.matchedRequirements.map((req, index) => (
                              <TableRow key={`matched-${index}`}>
                                <TableCell>{req}</TableCell>
                                <TableCell className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="text-green-600 dark:text-green-400">Matched</span>
                                </TableCell>
                              </TableRow>
                            ))}
                            {analysis.missingRequirements.map((req, index) => (
                              <TableRow key={`missing-${index}`}>
                                <TableCell>{req}</TableCell>
                                <TableCell className="flex items-center">
                                  <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                                  <span className="text-amber-600 dark:text-amber-400">Missing</span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                    
                    {/* NHS Values Section */}
                    <Card className="border border-muted">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">NHS Values Identified</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {analysis.nhsValues.map((value, index) => (
                            <Badge key={index} variant="default" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {value}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          These NHS values were identified in the job description and will be emphasized in your statement.
                        </p>
                      </CardContent>
                    </Card>
                    
                    {/* Recommendations */}
                    <Card className="border border-muted">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-2">
                          {analysis.recommendedHighlights.map((rec, index) => (
                            <li key={index} className="flex">
                              <ArrowRight className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    
                    {/* Writing Style Selection */}
                    <Card className="border border-muted">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Writing Style</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Select 
                          value={writingStyle}
                          onValueChange={(value: any) => setWritingStyle(value)}
                        >
                          <SelectTrigger id="writing-style">
                            <SelectValue placeholder="Select writing style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Simple (GCSE Level)</SelectItem>
                            <SelectItem value="moderate">Moderate (A-Level)</SelectItem>
                            <SelectItem value="advanced">Advanced (University Level)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select a writing style for your supporting statement. Simple writing styles may appear more human-written.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={generateTailoredStatement}
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
            )}
            
            {/* Step 2: Generated Statement */}
            {tailoredStatement && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    2
                  </div>
                  <div className="space-y-4 w-full">
                    <h3 className="text-lg font-medium">Tailored Statement</h3>
                    
                    <Textarea
                      value={tailoredStatement}
                      onChange={(e) => setTailoredStatement(e.target.value)}
                      className="min-h-[300px] font-medium"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CVAnalyzer;

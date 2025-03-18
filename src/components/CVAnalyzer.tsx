
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIService, CVAnalysisResult } from '@/services/AIService';
import { toast } from 'sonner';

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
  const [jobSpecificExperiences, setJobSpecificExperiences] = useState('');
  const [writingStyle, setWritingStyle] = useState<'simple' | 'moderate' | 'advanced'>('moderate');
  const [activeTab, setActiveTab] = useState('analysis');

  const analyzeCV = async () => {
    if (!cv || !jobDescription) {
      toast.error('Please upload both your CV and the job description first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await AIService.analyzeCV(cv, jobDescription);
      setAnalysis(result);
      setActiveTab('analysis');
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
        jobSpecificExperiences,
        writingStyle
      );
      
      setTailoredStatement(result.statement);
      if (!analysis) {
        setAnalysis(result.analysis);
      }
      
      setActiveTab('statement');
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
          <CardTitle>CV Analysis & Tailored Statement</CardTitle>
          <CardDescription>
            Analyze your CV against the job requirements and generate a tailored supporting statement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-experiences">Additional Job-Specific Experiences</Label>
                <Textarea
                  id="job-experiences"
                  placeholder="Add any specific experiences relevant to this job that might not be in your CV..."
                  className="min-h-[120px]"
                  value={jobSpecificExperiences}
                  onChange={(e) => setJobSpecificExperiences(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="writing-style">Writing Style</Label>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Simple writing style uses shorter sentences and simpler vocabulary, which may appear more human-written.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                variant="outline"
                onClick={analyzeCV}
                disabled={isAnalyzing || !cv || !jobDescription}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>Analyze CV</>
                )}
              </Button>
              <Button
                onClick={generateTailoredStatement}
                disabled={isGenerating || !cv || !jobDescription}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Tailored Statement
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {(analysis || tailoredStatement) && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="analysis">CV Analysis</TabsTrigger>
                <TabsTrigger value="statement">Tailored Statement</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="mt-4 space-y-4">
                {analysis && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Relevant Skills</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {analysis.relevantSkills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Job Requirements</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              Matched Requirements
                            </h4>
                            <ul className="text-sm space-y-1">
                              {analysis.matchedRequirements.map((req, index) => (
                                <li key={index} className="text-green-600 dark:text-green-400">{req}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center">
                              <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                              Missing Requirements
                            </h4>
                            <ul className="text-sm space-y-1">
                              {analysis.missingRequirements.map((req, index) => (
                                <li key={index} className="text-amber-600 dark:text-amber-400">{req}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Relevant Experience</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Clinical Experience</h4>
                            <ul className="text-sm space-y-1">
                              {analysis.relevantExperience.clinical.map((exp, index) => (
                                <li key={index}>{exp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Non-Clinical Experience</h4>
                            <ul className="text-sm space-y-1">
                              {analysis.relevantExperience.nonClinical.map((exp, index) => (
                                <li key={index}>{exp}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
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
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="statement" className="mt-4">
                {tailoredStatement ? (
                  <Textarea
                    value={tailoredStatement}
                    onChange={(e) => setTailoredStatement(e.target.value)}
                    className="min-h-[300px] font-medium"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Generate a tailored statement to view it here
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CVAnalyzer;

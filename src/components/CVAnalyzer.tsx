import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ArrowRight, Loader2, Users, BookOpen, Briefcase } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { AIService, CVAnalysisResult } from '@/services/AIService';
import { toast } from 'sonner';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

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
  const [additionalExperience, setAdditionalExperience] = useState('');
  const [additionalQualifications, setAdditionalQualifications] = useState('');
  const [additionalSkills, setAdditionalSkills] = useState('');
  const [unmatchedResponses, setUnmatchedResponses] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Analyze CV automatically when component loads if CV and job description are available
  useEffect(() => {
    if (cv && jobDescription && !analysis) {
      analyzeCV();
    }
  }, [cv, jobDescription]);

  const updateProgress = (stage: string, percent: number) => {
    setProgressStatus(stage);
    setProgress(percent);
  };

  const analyzeCV = async () => {
    if (!cv || !jobDescription) {
      toast.error('Please upload both your CV and the job description first');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setProgressStatus('Initializing...');
    
    try {
      console.log("Starting CV analysis");
      // Combine all additional information
      const combinedAdditionalInfo = [
        additionalExperience && `Additional Experience: ${additionalExperience}`,
        additionalQualifications && `Additional Qualifications: ${additionalQualifications}`,
        additionalSkills && `Additional Skills: ${additionalSkills}`
      ].filter(Boolean).join('\n\n');
      
      const result = await AIService.analyzeCV(
        cv, 
        jobDescription, 
        combinedAdditionalInfo, 
        updateProgress
      );
      
      console.log("Analysis result:", result);
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

  const handleUnmatchedResponse = (requirement: string, response: string) => {
    setUnmatchedResponses(prev => ({
      ...prev,
      [requirement]: response
    }));
  };

  const generateTailoredStatement = async () => {
    if (!cv || !jobDescription) {
      toast.error('Please upload both your CV and the job description first');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProgressStatus('Starting statement generation...');
    
    try {
      // Combine all additional information including unmatched responses
      const additionalInfo = [
        additionalExperience && `Additional Experience: ${additionalExperience}`,
        additionalQualifications && `Additional Qualifications: ${additionalQualifications}`,
        additionalSkills && `Additional Skills: ${additionalSkills}`,
        ...Object.entries(unmatchedResponses).map(([req, resp]) => 
          `Regarding "${req.replace(/^\[(Essential|Desirable)\]\s*/i, '')}": ${resp}`
        )
      ].filter(Boolean).join('\n\n');
      
      const result = await AIService.generateTailoredStatement(
        cv,
        jobDescription,
        additionalInfo,
        'simple', // Fixed to simple style (GCSE level)
        updateProgress
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CV & Job Description Analysis</CardTitle>
          <CardDescription>
            Comprehensive analysis of your CV against job requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Progress Bar - Always show when analyzing or generating */}
            {(isAnalyzing || isGenerating) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{progressStatus}</span>
                  <span>{progress}%</span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2" 
                  indicatorClassName={progress === 100 ? "bg-green-500" : ""}
                />
              </div>
            )}
            
            {/* Additional Information Inputs */}
            <Card className="border border-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Additional Information</CardTitle>
                <CardDescription>
                  Add any relevant information not mentioned in your CV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <FormLabel>Additional Experience</FormLabel>
                  <Textarea
                    placeholder="Describe any additional experiences relevant to this job that may not be in your CV..."
                    value={additionalExperience}
                    onChange={(e) => setAdditionalExperience(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <FormLabel>Additional Qualifications</FormLabel>
                  <Textarea
                    placeholder="List any additional qualifications not mentioned in your CV..."
                    value={additionalQualifications}
                    onChange={(e) => setAdditionalQualifications(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <FormLabel>Additional Skills</FormLabel>
                  <Textarea
                    placeholder="List any additional skills not mentioned in your CV..."
                    value={additionalSkills}
                    onChange={(e) => setAdditionalSkills(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline" 
                    onClick={analyzeCV} 
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Analysis...
                      </>
                    ) : (
                      <>Update Analysis</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Analysis in Progress */}
            {isAnalyzing && !analysis && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Analyzing your CV against job requirements...</p>
                <p className="text-sm text-muted-foreground">{progressStatus}</p>
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
                    
                    {/* Job Description Summary */}
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
                    
                    {/* Requirements Comparison Table */}
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
                                            onChange={(e) => handleUnmatchedResponse(req, e.target.value)}
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
                    
                    {/* Recommendations */}
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
            
            {/* Generation in Progress */}
            {isGenerating && !tailoredStatement && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generating your tailored statement...</p>
                <p className="text-sm text-muted-foreground">{progressStatus}</p>
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
                    
                    <div className="flex justify-end">
                      <Button onClick={() => onStatementGenerated(tailoredStatement)}>
                        Use This Statement
                      </Button>
                    </div>
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

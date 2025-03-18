
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
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
  const [activeStep, setActiveStep] = useState(1);

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
        jobSpecificExperiences,
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
          <CardTitle>Step-by-Step CV Analysis & Statement Generation</CardTitle>
          <CardDescription>
            Follow these steps to create a personalized NHS supporting statement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Step 1: Initial Information */}
            <div className={`border rounded-lg p-4 ${activeStep === 1 ? 'bg-muted/50 border-primary' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  1
                </div>
                <div className="space-y-4 w-full">
                  <h3 className="text-lg font-medium">Provide Additional Details</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-experiences">Additional Job-Specific Experiences</Label>
                      <Textarea
                        id="job-experiences"
                        placeholder="Add any specific experiences relevant to this job that might not be in your CV..."
                        className="min-h-[120px]"
                        value={jobSpecificExperiences}
                        onChange={(e) => setJobSpecificExperiences(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Include specific achievements, projects, and experiences that match this particular role.
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        Simple writing style uses shorter sentences and simpler vocabulary, which may appear more human-written.
                      </p>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={analyzeCV}
                        disabled={isAnalyzing || !cv || !jobDescription}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>Continue to Analysis</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Step 2: CV Analysis */}
            <div className={`border rounded-lg p-4 ${activeStep === 2 ? 'bg-muted/50 border-primary' : activeStep > 2 ? 'opacity-80' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  2
                </div>
                <div className="space-y-4 w-full">
                  <h3 className="text-lg font-medium">CV Analysis</h3>
                  
                  {analysis ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Skills and Requirements */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Relevant Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.relevantSkills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="space-y-2 mt-4">
                            <h4 className="font-medium flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              Matched Requirements
                            </h4>
                            <ul className="text-sm space-y-1">
                              {analysis.matchedRequirements.map((req, index) => (
                                <li key={index} className="text-green-600 dark:text-green-400">{req}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2 mt-4">
                            <h4 className="font-medium flex items-center">
                              <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                              Missing Requirements
                            </h4>
                            <ul className="text-sm space-y-1">
                              {analysis.missingRequirements.map((req, index) => (
                                <li key={index} className="text-amber-600 dark:text-amber-400">{req}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        {/* Experience */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Relevant Experience</h4>
                          
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Clinical Experience</h5>
                            <ul className="text-sm space-y-1">
                              {analysis.relevantExperience.clinical.map((exp, index) => (
                                <li key={index}>{exp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2 mt-4">
                            <h5 className="text-sm font-medium">Non-Clinical Experience</h5>
                            <ul className="text-sm space-y-1">
                              {analysis.relevantExperience.nonClinical.map((exp, index) => (
                                <li key={index}>{exp}</li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* NHS Values */}
                          <div className="space-y-2 mt-4">
                            <h5 className="text-sm font-medium">NHS Values Identified</h5>
                            <div className="flex flex-wrap gap-2">
                              {analysis.nhsValues.map((value, index) => (
                                <Badge key={index} variant="default" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                  {value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Recommendations */}
                      <div>
                        <h4 className="font-medium mb-2">Recommendations</h4>
                        <ul className="text-sm space-y-2">
                          {analysis.recommendedHighlights.map((rec, index) => (
                            <li key={index} className="flex">
                              <ArrowRight className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
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
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Complete step 1 to analyze your CV against the job requirements
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Step 3: Generated Statement */}
            <div className={`border rounded-lg p-4 ${activeStep === 3 ? 'bg-muted/50 border-primary' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  3
                </div>
                <div className="space-y-4 w-full">
                  <h3 className="text-lg font-medium">Tailored Statement</h3>
                  
                  {tailoredStatement ? (
                    <Textarea
                      value={tailoredStatement}
                      onChange={(e) => setTailoredStatement(e.target.value)}
                      className="min-h-[300px] font-medium"
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Complete steps 1 and 2 to generate your tailored statement
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CVAnalyzer;

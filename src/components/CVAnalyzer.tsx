import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AIService, CVAnalysisResult } from '@/services/ai';
import { toast } from 'sonner';
import AdditionalInformation from './cv-analyzer/AdditionalInformation';
import ProgressIndicator from './cv-analyzer/ProgressIndicator';
import LoadingSpinner from './cv-analyzer/LoadingSpinner';
import AnalysisStep from './cv-analyzer/AnalysisStep';
import TailoredStatement from './cv-analyzer/TailoredStatement';
import { Button } from './ui/button';
import { AlertTriangle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CVAnalyzerProps {
  cv: string;
  jobDescription: string;
  onStatementGenerated: (statement: string) => void;
}

const CVAnalyzer: React.FC<CVAnalyzerProps> = ({ cv, jobDescription, onStatementGenerated }) => {
  const navigate = useNavigate();
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
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    
    try {
      console.log("Starting CV analysis");
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
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
    setError(null);
    
    try {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Failed to generate statement. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const navigateToSettings = () => {
    navigate('/settings');
  };

  const renderError = () => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h3 className="text-lg font-medium text-red-800">Analysis Failed</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-sm text-gray-600 mb-4">
          {error?.includes('API key') || error?.includes('network') || error?.includes('fetch')
            ? "Please check your Anthropic API key in the Settings page or check your internet connection." 
            : "There was a problem analyzing your CV. Please try again."}
        </p>
        <div className="flex gap-3">
          <Button onClick={analyzeCV} variant="default">
            Try Again
          </Button>
          {(error?.includes('API key') || error?.includes('network') || error?.includes('fetch')) && (
            <Button onClick={navigateToSettings} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Go to Settings
            </Button>
          )}
        </div>
      </div>
    </div>
  );

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
            {(isAnalyzing || isGenerating) && (
              <ProgressIndicator status={progressStatus} progress={progress} />
            )}
            
            <AdditionalInformation 
              additionalExperience={additionalExperience}
              setAdditionalExperience={setAdditionalExperience}
              additionalQualifications={additionalQualifications}
              setAdditionalQualifications={setAdditionalQualifications}
              additionalSkills={additionalSkills}
              setAdditionalSkills={setAdditionalSkills}
              onUpdate={analyzeCV}
              isAnalyzing={isAnalyzing}
            />
            
            {isAnalyzing && !analysis && (
              <LoadingSpinner 
                message="Analyzing your CV against job requirements..." 
                status={progressStatus} 
              />
            )}
            
            {error && !isAnalyzing && (
              renderError()
            )}
            
            {!isAnalyzing && !error && analysis && activeStep === 2 && (
              <AnalysisStep 
                analysis={analysis}
                unmatchedResponses={unmatchedResponses}
                onUnmatchedResponse={handleUnmatchedResponse}
                onGenerateStatement={generateTailoredStatement}
                isGenerating={isGenerating}
              />
            )}
            
            {isGenerating && !tailoredStatement && (
              <LoadingSpinner 
                message="Generating your tailored statement..." 
                status={progressStatus} 
              />
            )}
            
            {tailoredStatement && activeStep === 3 && (
              <TailoredStatement 
                statement={tailoredStatement}
                onChange={setTailoredStatement}
                onSubmit={onStatementGenerated}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CVAnalyzer;

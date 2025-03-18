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
import { AlertTriangle, Settings, ExternalLink, Wifi, AlertCircle, Info, Shield, ServerCrash } from 'lucide-react';
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
  const [retryCount, setRetryCount] = useState(0);

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
      setRetryCount(0);
    } catch (error) {
      console.error('Error analyzing CV:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Failed to analyze CV. Please try again.');
      setRetryCount(prev => prev + 1);
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
      setRetryCount(0);
    } catch (error) {
      console.error('Error generating statement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Failed to generate statement. Please try again.');
      setRetryCount(prev => prev + 1);
    } finally {
      setIsGenerating(false);
    }
  };

  const navigateToSettings = () => {
    navigate('/admin/settings');
  };

  const renderError = () => {
    const isApiKeyError = error?.toLowerCase().includes('api key') || 
                          error?.toLowerCase().includes('anthropic') ||
                          error?.toLowerCase().includes('authentication') ||
                          error?.toLowerCase().includes('auth') ||
                          error?.toLowerCase().includes('401') ||
                          error?.toLowerCase().includes('403');
                          
    const isNetworkError = error?.toLowerCase().includes('network') || 
                           error?.toLowerCase().includes('fetch') || 
                           error?.toLowerCase().includes('timeout') ||
                           error?.toLowerCase().includes('connection') ||
                           error?.toLowerCase().includes('internet');
                           
    const isCorsError = error?.toLowerCase().includes('cors') || 
                         error?.toLowerCase().includes('cross-origin');
                           
    const isRateLimitError = error?.toLowerCase().includes('rate limit') ||
                             error?.toLowerCase().includes('too many requests') ||
                             error?.toLowerCase().includes('429');
                             
    const isEdgeFunctionError = error?.toLowerCase().includes('edge function') ||
                               error?.toLowerCase().includes('function') ||
                               error?.toLowerCase().includes('proxy');
                               
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <h3 className="text-lg font-medium text-red-800">Analysis Failed</h3>
          <p className="text-red-600 mb-4">{error}</p>
          
          {isApiKeyError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-amber-800 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="font-medium">API Key Issue Detected</p>
              </div>
              <p className="mb-2">Please check that you've entered a valid Anthropic API key in Settings.</p>
              <p className="text-xs mb-2">The key should start with "sk-ant-api".</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <a 
                  href="https://console.anthropic.com/account/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                >
                  Get an Anthropic API key
                  <ExternalLink className="h-3 w-3" />
                </a>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={navigateToSettings}
                  className="text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Go to Settings
                </Button>
              </div>
            </div>
          ) : isEdgeFunctionError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-amber-800 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <ServerCrash className="h-4 w-4 flex-shrink-0" />
                <p className="font-medium">Server Function Issue Detected</p>
              </div>
              <p className="mb-2">There's an issue with the server-side function that connects to the Anthropic API.</p>
              <p className="text-xs mb-2">The application is now using a server-side approach to avoid CORS issues. Please wait a moment for it to be ready.</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={navigateToSettings}
                  className="text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Check API Settings
                </Button>
              </div>
            </div>
          ) : isCorsError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-amber-800 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <p className="font-medium">CORS Issue Being Resolved</p>
              </div>
              <p className="mb-2">Your browser is blocking direct access to the Anthropic API due to security restrictions (CORS).</p>
              <p className="text-xs mb-2">We're now using a secure server-side approach that should resolve this issue. Please try again.</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button 
                  onClick={analyzeCV} 
                  variant="default"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : isNetworkError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-amber-800 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="h-4 w-4 flex-shrink-0" />
                <p className="font-medium">Network Issue Detected</p>
              </div>
              <p>There seems to be a problem connecting to the AI service. The application has been updated to use a more reliable approach.</p>
              {retryCount > 1 && (
                <p className="mt-2 text-xs">
                  If this issue persists after multiple attempts, it may be a temporary problem with the API servers.
                </p>
              )}
            </div>
          ) : isRateLimitError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-amber-800 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                <p className="font-medium">Rate Limit Exceeded</p>
              </div>
              <p>You've sent too many requests to the AI service in a short time. Please wait a moment before trying again.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">
              There was a problem analyzing your CV. Please try again or check your API settings.
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={analyzeCV} variant="default">
              Try Again
            </Button>
            <Button onClick={navigateToSettings} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              API Settings
            </Button>
          </div>
        </div>
      </div>
    );
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


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AIService, CVAnalysisResult } from '@/services/AIService';
import { toast } from 'sonner';

// Import refactored components
import AdditionalInformation from './cv-analyzer/AdditionalInformation';
import ProgressIndicator from './cv-analyzer/ProgressIndicator';
import LoadingSpinner from './cv-analyzer/LoadingSpinner';
import AnalysisStep from './cv-analyzer/AnalysisStep';
import TailoredStatement from './cv-analyzer/TailoredStatement';

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
              <ProgressIndicator status={progressStatus} progress={progress} />
            )}
            
            {/* Additional Information Inputs */}
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
            
            {/* Analysis in Progress */}
            {isAnalyzing && !analysis && (
              <LoadingSpinner 
                message="Analyzing your CV against job requirements..." 
                status={progressStatus} 
              />
            )}
            
            {/* Step 1: CV & JD Analysis with Comparison Table */}
            {!isAnalyzing && analysis && activeStep === 2 && (
              <AnalysisStep 
                analysis={analysis}
                unmatchedResponses={unmatchedResponses}
                onUnmatchedResponse={handleUnmatchedResponse}
                onGenerateStatement={generateTailoredStatement}
                isGenerating={isGenerating}
              />
            )}
            
            {/* Generation in Progress */}
            {isGenerating && !tailoredStatement && (
              <LoadingSpinner 
                message="Generating your tailored statement..." 
                status={progressStatus} 
              />
            )}
            
            {/* Step 2: Generated Statement */}
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

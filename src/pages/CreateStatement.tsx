
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone } from 'react-dropzone';
import { FileUp, FileText, Upload, Trash2, Download, Check, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { FileProcessingService, ProcessedFile } from '@/services/FileProcessingService';
import { toast } from 'sonner';
import CVAnalyzer from '@/components/CVAnalyzer';

type ProcessingStatus = 'idle' | 'processing' | 'complete' | 'error';

const CreateStatement: React.FC = () => {
  // State for the documents
  const [cv, setCV] = useState<ProcessedFile | null>(null);
  const [jobDescription, setJobDescription] = useState<ProcessedFile | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [generatedStatement, setGeneratedStatement] = useState<string>('');
  const [activeStep, setActiveStep] = useState(1);

  // CV dropzone
  const onDropCV = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    try {
      setProcessingStatus('processing');
      const file = acceptedFiles[0];
      const processedFile = await FileProcessingService.processFile(file);
      setCV(processedFile);
      setProcessingStatus('complete');
      toast.success('CV processed successfully');
      
      // Automatically proceed to analysis if both files are uploaded
      if (jobDescription) {
        setActiveStep(2);
      }
    } catch (error) {
      console.error('Error processing CV:', error);
      setProcessingStatus('error');
      toast.error('Failed to process CV. Please try another file.');
    }
  }, [jobDescription]);
  
  const { getRootProps: getCVRootProps, getInputProps: getCVInputProps, isDragActive: isCVDragActive } = useDropzone({
    onDrop: onDropCV,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });
  
  // Job description dropzone
  const onDropJobDescription = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    try {
      setProcessingStatus('processing');
      const file = acceptedFiles[0];
      const processedFile = await FileProcessingService.processFile(file);
      setJobDescription(processedFile);
      setProcessingStatus('complete');
      toast.success('Job description processed successfully');
      
      // Automatically proceed to analysis if both files are uploaded
      if (cv) {
        setActiveStep(2);
      }
    } catch (error) {
      console.error('Error processing job description:', error);
      setProcessingStatus('error');
      toast.error('Failed to process job description. Please try another file.');
    }
  }, [cv]);
  
  const { 
    getRootProps: getJobDescRootProps, 
    getInputProps: getJobDescInputProps, 
    isDragActive: isJobDescDragActive 
  } = useDropzone({
    onDrop: onDropJobDescription,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });
  
  // Handle document removal
  const handleRemoveCV = () => {
    setCV(null);
    if (activeStep > 1) {
      setActiveStep(1);
    }
    toast.info('CV removed');
  };
  
  const handleRemoveJobDescription = () => {
    setJobDescription(null);
    if (activeStep > 1) {
      setActiveStep(1);
    }
    toast.info('Job description removed');
  };
  
  // Handle statement from CV Analyzer
  const handleTailoredStatement = (statement: string) => {
    setGeneratedStatement(statement);
    setActiveStep(3);
  };
  
  // Handle statement download
  const downloadStatement = () => {
    if (!generatedStatement.trim()) {
      toast.error('Please generate a statement first');
      return;
    }
    
    const blob = new Blob([generatedStatement], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhs_supporting_statement.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Statement downloaded successfully');
  };
  
  // Step content rendering based on active step
  const renderStepContent = () => {
    switch (activeStep) {
      case 1: // Document Upload
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* CV Upload */}
              <Card className="hover-lift overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-nhs-blue" />
                    <h3 className="text-lg font-semibold">Upload Your CV</h3>
                  </div>
                  
                  {!cv ? (
                    <div 
                      {...getCVRootProps()} 
                      className={`file-input-area ${isCVDragActive ? 'drag-active' : ''}`}
                    >
                      <input {...getCVInputProps()} />
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {isCVDragActive ? (
                            "Drop your CV here"
                          ) : (
                            "Drag & drop your CV, or click to select"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports PDF, DOCX, DOC, TXT
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileUp className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">{cv.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(cv.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleRemoveCV}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      
                      <div className="document-preview">
                        <p className="whitespace-pre-wrap text-sm">
                          {cv.content.substring(0, 300)}...
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Job Description Upload */}
              <Card className="hover-lift overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-nhs-blue" />
                    <h3 className="text-lg font-semibold">Upload Job Description</h3>
                  </div>
                  
                  {!jobDescription ? (
                    <div 
                      {...getJobDescRootProps()} 
                      className={`file-input-area ${isJobDescDragActive ? 'drag-active' : ''}`}
                    >
                      <input {...getJobDescInputProps()} />
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {isJobDescDragActive ? (
                            "Drop the job description here"
                          ) : (
                            "Drag & drop the job description, or click to select"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports PDF, DOCX, DOC, TXT
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileUp className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">{jobDescription.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(jobDescription.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleRemoveJobDescription}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      
                      <div className="document-preview">
                        <p className="whitespace-pre-wrap text-sm">
                          {jobDescription.content.substring(0, 300)}...
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Next Button - Only if both documents are uploaded */}
            {cv && jobDescription && (
              <div className="flex justify-center">
                <Button
                  onClick={() => setActiveStep(2)}
                  className="w-full sm:w-auto"
                >
                  Continue to Analysis
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );
      
      case 2: // CV Analysis
        return (
          <CVAnalyzer 
            cv={cv?.content || ''}
            jobDescription={jobDescription?.content || ''}
            onStatementGenerated={handleTailoredStatement}
          />
        );
      
      case 3: // Final Statement
        return (
          <div className="space-y-8">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Your Supporting Statement</CardTitle>
                <CardDescription>
                  Your tailored statement based on CV and job description analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Textarea 
                  className="min-h-[400px] font-medium leading-relaxed"
                  value={generatedStatement}
                  onChange={(e) => setGeneratedStatement(e.target.value)}
                />
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveStep(2)}
                  >
                    Back to Analysis
                  </Button>
                  
                  <Button
                    onClick={downloadStatement}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Statement
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setCV(null);
                  setJobDescription(null);
                  setGeneratedStatement('');
                  setActiveStep(1);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Create New Statement
              </Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="container py-8 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
          Create Your NHS Supporting Statement
        </h1>
        <p className="text-lg text-muted-foreground">
          Upload your CV and job description to generate a tailored supporting statement for your NHS application
        </p>
      </div>
      
      {/* Steps Indicator */}
      <div className="mb-12">
        <div className="flex justify-between items-center">
          {[
            { step: 1, label: "Upload Documents" },
            { step: 2, label: "Analyze CV & JD" },
            { step: 3, label: "Final Statement" }
          ].map((step, index) => (
            <React.Fragment key={step.step}>
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                  activeStep >= step.step 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {activeStep > step.step ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.step
                  )}
                </div>
                <span className="mt-2 text-sm font-medium text-center hidden sm:block">
                  {step.label}
                </span>
              </div>
              
              {/* Connector line */}
              {index < 2 && (
                <div className="flex-1 mx-2">
                  <div className={`h-0.5 ${
                    activeStep > index + 1 
                      ? 'bg-primary' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      {renderStepContent()}
    </div>
  );
};

export default CreateStatement;

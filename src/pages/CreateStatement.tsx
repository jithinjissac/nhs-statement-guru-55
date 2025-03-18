
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone } from 'react-dropzone';
import { FileUp, FileText, Upload, Trash2, Download, Check, ChevronRight, RefreshCw, Loader2, HelpCircle, Book } from 'lucide-react';
import { FileProcessingService, ProcessedFile } from '@/services/FileProcessingService';
import { toast } from 'sonner';
import CVAnalyzer from '@/components/CVAnalyzer';
import { StorageService, Guideline, SampleStatement } from '@/services/StorageService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ProcessingStatus = 'idle' | 'processing' | 'complete' | 'error';

const CreateStatement: React.FC = () => {
  // State for the documents
  const [cv, setCV] = useState<ProcessedFile | null>(null);
  const [jobDescription, setJobDescription] = useState<ProcessedFile | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [generatedStatement, setGeneratedStatement] = useState<string>('');
  const [activeStep, setActiveStep] = useState(1);
  
  // State for guidelines and samples
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [sampleStatements, setSampleStatements] = useState<SampleStatement[]>([]);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null);
  const [isSamplesOpen, setIsSamplesOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<SampleStatement | null>(null);
  const [isLoadingGuidelines, setIsLoadingGuidelines] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch guidelines and sample statements
  useEffect(() => {
    fetchGuidelines();
    fetchSampleStatements();
  }, []);
  
  const fetchGuidelines = async () => {
    setIsLoadingGuidelines(true);
    try {
      const data = await StorageService.getGuidelines();
      setGuidelines(data);
    } catch (error) {
      console.error('Failed to fetch guidelines:', error);
    } finally {
      setIsLoadingGuidelines(false);
    }
  };
  
  const fetchSampleStatements = async () => {
    setIsLoadingSamples(true);
    try {
      const data = await StorageService.getSampleStatements();
      setSampleStatements(data);
    } catch (error) {
      console.error('Failed to fetch sample statements:', error);
    } finally {
      setIsLoadingSamples(false);
    }
  };

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
  
  // Handle guideline preview
  const handleGuidelinePreview = (guideline: Guideline) => {
    setSelectedGuideline(guideline);
    setIsGuidelinesOpen(true);
  };
  
  // Handle sample statement preview
  const handleSamplePreview = (sample: SampleStatement) => {
    setSelectedSample(sample);
    setIsSamplesOpen(true);
  };
  
  // Get unique categories for sample statements filter
  const categories = [...new Set(sampleStatements.map(sample => sample.category))];
  
  // Filter sample statements by category
  const filteredSamples = selectedCategory
    ? sampleStatements.filter(sample => sample.category === selectedCategory)
    : sampleStatements;
  
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
            
            {/* Resources Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Resources</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Guidelines */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-blue-600" />
                      NHS Statement Guidelines
                    </CardTitle>
                    <CardDescription>
                      Tips and guidance for creating effective NHS supporting statements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingGuidelines ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : guidelines.length > 0 ? (
                      <Accordion type="single" collapsible>
                        {guidelines.slice(0, 3).map((guideline) => (
                          <AccordionItem key={guideline.id} value={guideline.id}>
                            <AccordionTrigger>{guideline.title}</AccordionTrigger>
                            <AccordionContent>
                              <p className="line-clamp-3 text-muted-foreground mb-2">
                                {guideline.content.substring(0, 150)}...
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleGuidelinePreview(guideline)}
                              >
                                Read More
                              </Button>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No guidelines available
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Sample Statements */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Book className="h-5 w-5 text-blue-600" />
                      Sample Statements
                    </CardTitle>
                    <CardDescription>
                      Example statements to inspire your NHS application
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingSamples ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : sampleStatements.length > 0 ? (
                      <div className="space-y-4">
                        <Select
                          value={selectedCategory || ''}
                          onValueChange={(value) => setSelectedCategory(value || null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Categories</SelectItem>
                            {categories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="space-y-3">
                          {filteredSamples.slice(0, 3).map((sample) => (
                            <div key={sample.id} className="p-3 border rounded-md">
                              <div className="flex justify-between mb-2">
                                <h4 className="font-medium">{sample.title}</h4>
                                <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                  {sample.category.charAt(0).toUpperCase() + sample.category.slice(1)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {sample.content.substring(0, 120)}...
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSamplePreview(sample)}
                              >
                                View Sample
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No sample statements available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
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
      
      {/* Guideline Preview Dialog */}
      <Dialog open={isGuidelinesOpen} onOpenChange={setIsGuidelinesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedGuideline?.title || 'Guideline'}</DialogTitle>
            <DialogDescription>
              NHS supporting statement guideline
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 whitespace-pre-wrap">
              {selectedGuideline?.content || ''}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Sample Statement Preview Dialog */}
      <Dialog open={isSamplesOpen} onOpenChange={setIsSamplesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedSample?.title || 'Sample Statement'}</DialogTitle>
            <DialogDescription>
              Category: {selectedSample?.category ? (selectedSample.category.charAt(0).toUpperCase() + selectedSample.category.slice(1)) : 'General'}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 whitespace-pre-wrap">
              {selectedSample?.content || ''}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateStatement;

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone } from 'react-dropzone';
import { FileUp, FileText, Upload, Trash2, Download, Check, AlertTriangle, RefreshCw, ChevronRight, Settings, Shield } from 'lucide-react';
import { FileProcessingService, ProcessedFile } from '@/services/FileProcessingService';
import { AIService, StatementGenerationOptions } from '@/services/AIService';
import { StorageService } from '@/services/StorageService';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import CVAnalyzer from '@/components/CVAnalyzer';

type ProcessingStatus = 'idle' | 'processing' | 'complete' | 'error';

const CreateStatement: React.FC = () => {
  // State for the documents
  const [cv, setCV] = useState<ProcessedFile | null>(null);
  const [jobDescription, setJobDescription] = useState<ProcessedFile | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [generatedStatement, setGeneratedStatement] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const [editedStatement, setEditedStatement] = useState('');
  const [detectionResults, setDetectionResults] = useState<any[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Generation options
  const [generationOptions, setGenerationOptions] = useState<StatementGenerationOptions>({
    humanizeLevel: 'high',
    tone: 'professional',
    detailLevel: 'detailed',
    focusAreas: [],
  });
  
  // Get guidelines and samples from storage
  const guidelines = StorageService.getGuidelines();
  const sampleStatements = StorageService.getSampleStatements();
  
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
    } catch (error) {
      console.error('Error processing CV:', error);
      setProcessingStatus('error');
      toast.error('Failed to process CV. Please try another file.');
    }
  }, []);
  
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
    } catch (error) {
      console.error('Error processing job description:', error);
      setProcessingStatus('error');
      toast.error('Failed to process job description. Please try another file.');
    }
  }, []);
  
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
    toast.info('CV removed');
  };
  
  const handleRemoveJobDescription = () => {
    setJobDescription(null);
    toast.info('Job description removed');
  };
  
  // Handle statement from CV Analyzer
  const handleTailoredStatement = (statement: string) => {
    setGeneratedStatement(statement);
    setEditedStatement(statement);
    setActiveStep(2);
  };
  
  // Generate the statement
  const generateStatement = async () => {
    if (!cv || !jobDescription) {
      toast.error('Please upload both your CV and the job description');
      return;
    }
    
    setIsGenerating(true);
    setProgress(0);
    
    try {
      // Simulate progress updates
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 300);
      
      // Get guidelines and samples for the prompt
      const guidelineContents = guidelines.map(g => g.content);
      const sampleContents = sampleStatements.map(s => s.content);
      
      // Generate the statement
      const statement = await AIService.generateStatement(
        cv.content,
        jobDescription.content,
        guidelineContents,
        sampleContents,
        generationOptions
      );
      
      setGeneratedStatement(statement);
      setEditedStatement(statement);
      setActiveStep(2);
      toast.success('Supporting statement generated successfully');
      
      clearInterval(interval);
      setProgress(100);
    } catch (error) {
      console.error('Error generating statement:', error);
      toast.error('Failed to generate statement. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Test AI detection
  const testAIDetection = async () => {
    if (!editedStatement.trim()) {
      toast.error('Please generate or enter a statement to test');
      return;
    }
    
    setIsDetecting(true);
    
    try {
      const results = await AIService.detectAI(editedStatement);
      setDetectionResults(results);
      
      // Check overall result
      const isDetectedAsAI = results.some(result => result.isAI);
      
      if (isDetectedAsAI) {
        toast.warning('Your statement may be detected as AI-generated. Consider humanizing it further.');
      } else {
        toast.success('Your statement appears human-written in all detection tests!');
      }
      
      setActiveStep(3);
    } catch (error) {
      console.error('Error testing AI detection:', error);
      toast.error('Failed to test AI detection. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };
  
  // Humanize the statement
  const humanizeStatement = async () => {
    if (!editedStatement.trim()) {
      toast.error('Please generate a statement first');
      return;
    }
    
    try {
      setIsGenerating(true);
      const humanizedText = await AIService.humanizeText(editedStatement, 'high');
      setEditedStatement(humanizedText);
      toast.success('Statement humanized successfully');
    } catch (error) {
      console.error('Error humanizing statement:', error);
      toast.error('Failed to humanize statement. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle statement download
  const downloadStatement = () => {
    if (!editedStatement.trim()) {
      toast.error('Please generate a statement first');
      return;
    }
    
    const blob = new Blob([editedStatement], { type: 'text/plain' });
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
      
      {/* Stepper */}
      <div className="mb-12">
        <div className="flex justify-between items-center">
          {[
            { step: 1, label: "Upload Documents" },
            { step: 2, label: "Generate & Edit" },
            { step: 3, label: "Test & Download" }
          ].map((step, index) => (
            <React.Fragment key={step.step}>
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                  activeStep >= step.step 
                    ? 'bg-nhs-blue text-white' 
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
                      ? 'bg-nhs-blue' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Step 1: Document Upload */}
      {activeStep === 1 && (
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
          
          {/* Advanced Analysis (New) */}
          {cv && jobDescription && (
            <div className="md:col-span-2 mt-6">
              <Tabs defaultValue="standard">
                <TabsList className="mb-4">
                  <TabsTrigger value="standard">Standard Generation</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="standard">
                  {/* Generation Options */}
                  <Card className="hover-lift overflow-hidden">
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-nhs-blue" />
                        <h3 className="text-lg font-semibold">Statement Generation Options</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Tone</Label>
                            <Select 
                              value={generationOptions.tone} 
                              onValueChange={(value: any) => setGenerationOptions({
                                ...generationOptions,
                                tone: value
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select tone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="conversational">Conversational</SelectItem>
                                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Professional is formal and polished, conversational is warm and approachable, enthusiastic shows passion.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Detail Level</Label>
                            <Select 
                              value={generationOptions.detailLevel} 
                              onValueChange={(value: any) => setGenerationOptions({
                                ...generationOptions,
                                detailLevel: value
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select detail level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="concise">Concise</SelectItem>
                                <SelectItem value="detailed">Detailed</SelectItem>
                                <SelectItem value="comprehensive">Comprehensive</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Concise is brief, detailed includes specific examples, comprehensive is thorough and extensive.
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Humanization Level</Label>
                            <div className="pt-2">
                              <Slider
                                defaultValue={[2]}
                                max={3}
                                min={1}
                                step={1}
                                onValueChange={(value) => {
                                  const level = value[0];
                                  let humanizeLevel: 'low' | 'medium' | 'high' = 'medium';
                                  if (level === 1) humanizeLevel = 'low';
                                  if (level === 2) humanizeLevel = 'medium';
                                  if (level === 3) humanizeLevel = 'high';
                                  setGenerationOptions({
                                    ...generationOptions,
                                    humanizeLevel
                                  });
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Low</span>
                              <span>Medium</span>
                              <span>High</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Higher humanization makes the statement more natural but may reduce precision.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>NHS Values Focus</Label>
                              <Switch
                                checked={generationOptions.focusAreas.includes('nhs-values')}
                                onCheckedChange={(checked) => {
                                  const updatedAreas = [...generationOptions.focusAreas];
                                  if (checked) {
                                    updatedAreas.push('nhs-values');
                                  } else {
                                    const index = updatedAreas.indexOf('nhs-values');
                                    if (index > -1) {
                                      updatedAreas.splice(index, 1);
                                    }
                                  }
                                  setGenerationOptions({
                                    ...generationOptions,
                                    focusAreas: updatedAreas
                                  });
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Emphasize NHS values like respect, dignity, compassion, and commitment to quality.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Generate Button */}
                  <div className="flex justify-center mt-4">
                    <Button 
                      size="lg" 
                      onClick={generateStatement}
                      disabled={!cv || !jobDescription || isGenerating}
                      className="w-full md:w-auto"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating Statement...
                        </>
                      ) : (
                        <>
                          Generate Supporting Statement
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced">
                  <CVAnalyzer 
                    cv={cv?.content || ''}
                    jobDescription={jobDescription?.content || ''}
                    onStatementGenerated={handleTailoredStatement}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          {/* Progress indicator */}
          {isGenerating && (
            <div className="md:col-span-2 mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground mt-2">
                {progress < 100 ? 'Analyzing your documents and creating your statement...' : 'Statement generated!'}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Step 2: Edit Statement */}
      {activeStep === 2 && (
        <div className="space-y-8">
          <Card className="overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-nhs-blue" />
                  <h3 className="text-lg font-semibold">Your Supporting Statement</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        View Guidelines
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>NHS Supporting Statement Guidelines</DialogTitle>
                        <DialogDescription>
                          Follow these guidelines to improve your statement
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="max-h-96 overflow-y-auto space-y-4 my-4">
                        {guidelines.length > 0 ? (
                          <Accordion type="single" collapsible className="w-full">
                            {guidelines.map(guideline => (
                              <AccordionItem key={guideline.id} value={guideline.id}>
                                <AccordionTrigger>{guideline.title}</AccordionTrigger>
                                <AccordionContent>
                                  <div className="whitespace-pre-wrap text-sm">
                                    {guideline.content}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No guidelines available</p>
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" type="button">
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={humanizeStatement}
                    disabled={isGenerating}
                    title="Humanize Statement"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M21 14c0-1.105-1.343-2-3-2s-3 .895-3 2c0 .249.068.487.19.713.683 1.295 2.81 1.287 2.81 1.287s2.127.008 2.81-1.287c.122-.226.19-.464.19-.713z"/>
                        <path d="M12 12s-2 1-2 2c0 .5 2 1 2 2 0-1 2-2 2-2s-2-1-2-2z"/>
                        <path d="M12 17c-1 0-3 1-3 3"/>
                        <path d="M12 17c1 0 3 1 3 3"/>
                        <path d="M3 10c0 1.105 1.343 2 3 2s3-.895 3-2c0-.249-.068-.487-.19-.713C8.127 7.992 6 8 6 8S3.873 7.992 3.19 9.287C3.068 9.513 3 9.751 3 10z"/>
                        <path d="M6 10v10"/>
                        <path d="M12 10v4"/>
                        <path d="M18 10v4"/>
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
              
              <Textarea 
                className="min-h-[400px] font-medium leading-relaxed"
                placeholder="Your supporting statement will appear here"
                value={editedStatement}
                onChange={(e) => setEditedStatement(e.target.value)}
              />
            </CardContent>
          </Card>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setActiveStep(1)}
            >
              Back to Upload
            </Button>
            
            <Button
              onClick={testAIDetection}
              disabled={!editedStatement.trim() || isDetecting}
            >
              {isDetecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  Test AI Detection
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Step 3: Test and Download */}
      {activeStep === 3 && (
        <div className="space-y-8">
          <Card className="overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-nhs-blue" />
                <h3 className="text-lg font-semibold">AI Detection Results</h3>
              </div>
              
              {detectionResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detectionResults.map((result, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{result.detectorName}</h4>
                          <div className={`analysis-pill ${result.isAI ? 'poor' : 'good'}`}>
                            {result.isAI ? 'AI Detected' : 'Human'}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">AI score</span>
                            <span className="font-medium">{(result.score * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                result.isAI 
                                  ? 'bg-red-500' 
                                  : 'bg-green-500'
                              }`} 
                              style={{ width: `${result.score * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Confidence: <span className="font-medium capitalize">{result.confidence}</span>
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No detection results available</p>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                {detectionResults.some(result => result.isAI) ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      Your statement may be detected as AI-generated. Consider further editing or humanizing it.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">
                      Congratulations! Your statement appears human-written in all detection tests.
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-nhs-blue" />
                <h3 className="text-lg font-semibold">Final Supporting Statement</h3>
              </div>
              
              <Textarea 
                className="min-h-[200px] font-medium leading-relaxed"
                value={editedStatement}
                onChange={(e) => setEditedStatement(e.target.value)}
              />
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveStep(2)}
                >
                  Edit Again
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={testAIDetection}
                  disabled={isDetecting}
                >
                  {isDetecting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Re-test
                </Button>
                
                <Button
                  onClick={downloadStatement}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setActiveStep(2)}
            >
              Back to Editor
            </Button>
            
            <Button
              onClick={() => {
                setCV(null);
                setJobDescription(null);
                setGeneratedStatement('');
                setEditedStatement('');
                setDetectionResults([]);
                setActiveStep(1);
              }}
            >
              Create New Statement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateStatement;

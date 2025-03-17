
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, Check, RefreshCw, Info } from 'lucide-react';
import { AIService } from '@/services/AIService';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AIDetection: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectionResults, setDetectionResults] = useState<any[]>([]);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };
  
  const handleDetect = async () => {
    if (!text.trim()) {
      toast.error('Please enter text to analyze');
      return;
    }
    
    if (text.length < 100) {
      toast.warning('For accurate detection, enter at least 100 characters');
      return;
    }
    
    setIsDetecting(true);
    
    try {
      const results = await AIService.detectAI(text);
      setDetectionResults(results);
      
      const isDetectedAsAI = results.some(result => result.isAI);
      
      if (isDetectedAsAI) {
        toast.warning('The text may be detected as AI-generated');
      } else {
        toast.success('The text appears human-written in all detection tests!');
      }
    } catch (error) {
      console.error('Error during AI detection:', error);
      toast.error('Failed to analyze text. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };
  
  const handleClear = () => {
    setText('');
    setDetectionResults([]);
  };
  
  const getOverallStatus = () => {
    if (detectionResults.length === 0) return null;
    
    const isAnyDetected = detectionResults.some(result => result.isAI);
    const percentage = Math.round(
      (detectionResults.filter(result => !result.isAI).length / detectionResults.length) * 100
    );
    
    return {
      isAnyDetected,
      percentage
    };
  };
  
  const overallStatus = getOverallStatus();
  
  return (
    <div className="container py-8 md:py-12">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          AI Text Detection
        </h1>
        <p className="text-lg text-muted-foreground">
          Test if your statement appears to be AI-generated using multiple detection tools
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Paste your text for analysis</CardTitle>
              <CardDescription>
                Enter your NHS Supporting Statement or any text you want to analyze
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your text here..."
                className="min-h-[300px] font-medium"
                value={text}
                onChange={handleTextChange}
              />
              
              <div className="flex justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                  {text.length} characters (min. recommended: 100)
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={handleClear}>
                    Clear
                  </Button>
                  <Button
                    onClick={handleDetect}
                    disabled={isDetecting || !text.trim()}
                  >
                    {isDetecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Analyze Text
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {overallStatus && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    {overallStatus.isAnyDetected ? (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">
                          This text may be detected as AI-generated on some platforms.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">
                          This text appears human-written across all detection tools!
                        </span>
                      </div>
                    )}
                    
                    <div className="text-xl font-bold">
                      {overallStatus.percentage}% <span className="text-sm font-normal text-muted-foreground">Human</span>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="results">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="results">Detailed Results</TabsTrigger>
                      <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="results" className="space-y-4">
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
                    </TabsContent>
                    
                    <TabsContent value="recommendations" className="space-y-4">
                      {overallStatus.isAnyDetected ? (
                        <div className="space-y-4">
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Recommendations for avoiding AI detection</AlertTitle>
                            <AlertDescription>
                              Based on your analysis results, here are some ways to make your text appear more human-written.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="space-y-3">
                            <h4 className="font-semibold">Tips to make your text appear more human:</h4>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                              <li>Vary your sentence length and structure more</li>
                              <li>Include personal anecdotes or specific examples</li>
                              <li>Use more informal language occasionally (contractions, idioms)</li>
                              <li>Incorporate small grammatical irregularities</li>
                              <li>Replace some complex vocabulary with simpler alternatives</li>
                              <li>Reduce repetitive phrases and sentence starters</li>
                              <li>Include more emotional language where appropriate</li>
                              <li>Add transitions that feel natural rather than formulaic</li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <div className="rounded-full bg-green-100 p-3 w-fit mx-auto mb-4 dark:bg-green-900/30">
                            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">Great job!</h3>
                          <p className="text-muted-foreground">
                            Your text already appears human-written. No changes are needed.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>What is AI Detection?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                AI detection tools analyze text patterns to identify content that might have been generated by AI systems like ChatGPT or Claude.
              </p>
              <p className="text-muted-foreground">
                These tools look for indicators such as:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Repetitive sentence structures</li>
                <li>Unusual word distributions</li>
                <li>Consistent formatting patterns</li>
                <li>Predictable language use</li>
                <li>Lack of nuance or personal voice</li>
              </ul>
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important Note</AlertTitle>
                <AlertDescription>
                  No AI detection tool is 100% accurate. These are probabilistic estimates that can produce both false positives and false negatives.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Why It Matters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                For NHS applications, human-written supporting statements are generally preferred because they:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Demonstrate genuine interest and effort</li>
                <li>Showcase your personal communication style</li>
                <li>Reflect authentic experiences and perspectives</li>
                <li>Avoid potential concerns about AI-generated content</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Our tool helps ensure your carefully crafted statement passes common AI detection methods while maintaining your professional voice.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIDetection;

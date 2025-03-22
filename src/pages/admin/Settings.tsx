import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { AIService, AIModelConfig } from '@/services/ai';
import { StorageService } from '@/services/StorageService';
import { AlertCircle, CheckCircle2, Key, Info, ShieldAlert, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import PromptsTab from '@/components/admin/PromptsTab';

const AdminSettings: React.FC = () => {
  // Get authentication status
  const { user, isAdmin } = useAuth();
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    isAdmin: boolean;
  }>({
    isAuthenticated: false,
    isAdmin: false
  });
  
  // AI models settings
  const [models, setModels] = useState<AIModelConfig[]>(AIService.getModels());
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: '',
    anthropic: '',
    'mistral ai': '',
  });
  
  // General app settings
  const [generalSettings, setGeneralSettings] = useState({
    defaultHumanizeLevel: 'medium',
    maxStatementLength: 2000,
    enableAIDetection: true,
    enableRealTimePreview: true,
  });

  // Stats for system status card
  const [guidelinesCount, setGuidelinesCount] = useState(0);
  const [sampleStatementsCount, setSampleStatementsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const authenticated = !!data.session;
        setAuthStatus({
          isAuthenticated: authenticated,
          isAdmin: isAdmin()
        });
        console.log("Auth status:", authenticated ? "Authenticated" : "Not authenticated", isAdmin() ? "Admin" : "Not admin");
      } catch (error) {
        console.error("Error checking auth status:", error);
        setAuthStatus({
          isAuthenticated: false,
          isAdmin: false
        });
      }
    };
    
    checkAuth();
  }, [user, isAdmin]);
  
  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // Load API keys from database or fallback storage
        try {
          const savedApiKeys = await StorageService.getApiKeys();
          if (Object.keys(savedApiKeys).length > 0) {
            setApiKeys(prevKeys => ({
              ...prevKeys,
              ...savedApiKeys
            }));
            
            // Also set the API keys in AIService
            Object.entries(savedApiKeys).forEach(([provider, key]) => {
              if (key) {
                AIService.setApiKey(provider, key as string);
              }
            });
          }
        } catch (error) {
          console.error("Error loading API keys:", error);
          setUsingFallback(true);
          toast.error("Error loading API keys from database. Using local storage fallback.");
        }
        
        // Load general settings from local storage
        const savedSettings = StorageService.getSettings();
        if (savedSettings) {
          // Load general settings
          if (savedSettings.general) {
            setGeneralSettings(prevSettings => ({
              ...prevSettings,
              ...savedSettings.general
            }));
          }
          
          // Load model settings
          if (savedSettings.models) {
            const updatedModels = models.map(model => {
              const savedModel = savedSettings.models.find((m: any) => m.id === model.id);
              if (savedModel) {
                return {
                  ...model,
                  enabled: savedModel.enabled,
                  temperature: savedModel.temperature || model.temperature,
                  maxTokens: savedModel.maxTokens || model.maxTokens
                };
              }
              return model;
            });
            
            setModels(updatedModels);
            
            // Update models in AIService
            updatedModels.forEach(model => {
              AIService.setModelEnabled(model.id, model.enabled);
            });
          }
        }

        // Try to load counts for system status
        try {
          const guidelines = await StorageService.getGuidelines();
          setGuidelinesCount(guidelines.length);

          const sampleStatements = await StorageService.getSampleStatements();
          setSampleStatementsCount(sampleStatements.length);
        } catch (error) {
          console.error("Error loading counts:", error);
          setGuidelinesCount(0);
          setSampleStatementsCount(0);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);
  
  // Save all settings
  const saveSettings = async () => {
    setIsLoading(true);
    let anyErrors = false;
    let usingFallbackStorage = false;
    
    try {
      // Save API keys to the database with fallback to local storage
      for (const [provider, key] of Object.entries(apiKeys)) {
        if (key && key.trim() !== '') {
          try {
            await StorageService.saveApiKey(provider, key);
            // Also update the API keys in AIService
            AIService.setApiKey(provider, key);
          } catch (error) {
            console.error(`Error saving ${provider} API key:`, error);
            anyErrors = true;
            usingFallbackStorage = true;
          }
        }
      }
      
      // Save general settings to local storage
      StorageService.saveSettings({
        general: generalSettings,
        models: models.map(model => ({
          id: model.id,
          enabled: model.enabled,
          temperature: model.temperature,
          maxTokens: model.maxTokens
        }))
      });
      
      // Update models in AIService
      models.forEach(model => {
        AIService.setModelEnabled(model.id, model.enabled);
      });
      
      if (anyErrors && usingFallbackStorage) {
        setUsingFallback(true);
        toast.warning('Some settings saved to local storage due to database issues. Your API keys are still available for use.', {
          duration: 6000
        });
      } else {
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save some settings');
      anyErrors = true;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle API key changes
  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider.toLowerCase()]: value
    }));
  };
  
  // Handle model toggle
  const handleModelToggle = (modelId: string, enabled: boolean) => {
    setModels(prev => 
      prev.map(model => 
        model.id === modelId ? { ...model, enabled } : model
      )
    );
  };
  
  // Handle model temperature change
  const handleTemperatureChange = (modelId: string, temperature: number) => {
    setModels(prev => 
      prev.map(model => 
        model.id === modelId ? { ...model, temperature } : model
      )
    );
  };
  
  // Handle general settings change
  const handleGeneralSettingChange = (
    setting: keyof typeof generalSettings,
    value: any
  ) => {
    setGeneralSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure application settings and API keys
          </p>
        </div>
        <Button onClick={saveSettings} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
      
      {!authStatus.isAuthenticated && (
        <Alert className="mb-6 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/30">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You are not currently authenticated. API keys will be stored in local storage only, 
            which means they will only be available on this device. Sign in to save settings to your account.
          </AlertDescription>
        </Alert>
      )}
      
      {usingFallback && (
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/30">
          <Info className="h-4 w-4" />
          <AlertTitle>Using Local Storage</AlertTitle>
          <AlertDescription>
            {authStatus.isAuthenticated 
              ? "Due to database policy issues, some settings are being stored in local storage."
              : "You are not logged in, so settings are being stored in local storage only."}
            Your settings will still work, but they will be limited to this browser.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 mb-8">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        
        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                API Keys
              </CardTitle>
              <CardDescription>
                Configure API keys for the AI models used in the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/30">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  API keys are stored securely. Enter your API keys below to enable AI features.
                  {!authStatus.isAuthenticated && " You are not logged in, so keys will only be stored in your browser."}
                  {usingFallback && authStatus.isAuthenticated && " Currently using local storage due to database issues."}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKeys.openai}
                    onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for GPT-3.5 and GPT-4 models. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Get a key</a>
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                  <Input
                    id="anthropic-key"
                    type="password"
                    placeholder="sk_ant-..."
                    value={apiKeys.anthropic}
                    onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for Claude models. <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Get a key</a>
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mistral-key">Mistral AI API Key</Label>
                  <Input
                    id="mistral-key"
                    type="password"
                    placeholder="..."
                    value={apiKeys['mistral ai']}
                    onChange={(e) => handleApiKeyChange('mistral ai', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for Mixtral models. <a href="https://console.mistral.ai/api-keys/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Get a key</a>
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveSettings} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save API Keys'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* AI Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Models Configuration</CardTitle>
              <CardDescription>
                Enable or disable AI models and configure their parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {models.map((model) => (
                <div 
                  key={model.id} 
                  className="p-4 border rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{model.name}</h3>
                      <p className="text-sm text-muted-foreground">Provider: {model.provider}</p>
                    </div>
                    <Switch
                      checked={model.enabled}
                      onCheckedChange={(checked) => handleModelToggle(model.id, checked)}
                    />
                  </div>
                  
                  {model.enabled && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor={`temp-${model.id}`}>Temperature: {model.temperature.toFixed(1)}</Label>
                        </div>
                        <Slider
                          id={`temp-${model.id}`}
                          min={0}
                          max={1}
                          step={0.1}
                          defaultValue={[model.temperature]}
                          onValueChange={(value) => handleTemperatureChange(model.id, value[0])}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>More Precise</span>
                          <span>More Creative</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Max Tokens:</span>
                        <span className="font-medium">{model.maxTokens.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button onClick={saveSettings} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Model Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-6">
          <PromptsTab />
        </TabsContent>
        
        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-detection">Enable AI Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to check if their statements appear AI-generated
                    </p>
                  </div>
                  <Switch
                    id="ai-detection"
                    checked={generalSettings.enableAIDetection}
                    onCheckedChange={(checked) => 
                      handleGeneralSettingChange('enableAIDetection', checked)
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="real-time-preview">Real-time Preview</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable real-time preview while editing statements
                    </p>
                  </div>
                  <Switch
                    id="real-time-preview"
                    checked={generalSettings.enableRealTimePreview}
                    onCheckedChange={(checked) => 
                      handleGeneralSettingChange('enableRealTimePreview', checked)
                    }
                  />
                </div>
                
                <div className="space-y-2 pt-2">
                  <Label>Default Humanize Level</Label>
                  <div className="flex space-x-2">
                    {['low', 'medium', 'high'].map((level) => (
                      <Button
                        key={level}
                        type="button"
                        variant={generalSettings.defaultHumanizeLevel === level ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => handleGeneralSettingChange('defaultHumanizeLevel', level)}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The default level of humanization applied to generated statements
                  </p>
                </div>
                
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="max-length">
                      Max Statement Length: {generalSettings.maxStatementLength.toLocaleString()} characters
                    </Label>
                  </div>
                  <Slider
                    id="max-length"
                    min={500}
                    max={5000}
                    step={100}
                    defaultValue={[generalSettings.maxStatementLength]}
                    onValueChange={(value) => 
                      handleGeneralSettingChange('maxStatementLength', value[0])
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum character length for generated statements
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveSettings} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save General Settings'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current system status and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-medium">System is operational</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm font-medium">Guidelines</p>
                    <p className="text-2xl font-bold">{guidelinesCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sample Statements</p>
                    <p className="text-2xl font-bold">{sampleStatementsCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Enabled Models</p>
                    <p className="text-2xl font-bold">{models.filter(m => m.enabled).length}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">API Keys Configured</p>
                    <p className="text-2xl font-bold">
                      {Object.values(apiKeys).filter(key => key.trim() !== '').length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;

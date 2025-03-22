
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { PromptService, SystemPrompt } from '@/services/PromptService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const PromptsTab: React.FC = () => {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [editedPrompts, setEditedPrompts] = useState<Record<string, Partial<SystemPrompt>>>({});
  const [error, setError] = useState<string | null>(null);

  // Load prompts from the database
  useEffect(() => {
    const loadPrompts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const promptsData = await PromptService.getAllPrompts();
        setPrompts(promptsData);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(promptsData.map(prompt => prompt.category)));
        setCategories(uniqueCategories);
        
        // Set default selected category
        if (uniqueCategories.length > 0 && !selectedCategory) {
          setSelectedCategory(uniqueCategories[0]);
        }
      } catch (error) {
        console.error('Failed to load prompts:', error);
        setError('Failed to load prompts. Please refresh the page or contact support.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPrompts();
  }, []);

  // Handle changes to prompt fields
  const handlePromptChange = (promptId: string, field: keyof SystemPrompt, value: string) => {
    setEditedPrompts(prev => ({
      ...prev,
      [promptId]: {
        ...prev[promptId],
        [field]: value
      }
    }));
  };

  // Save prompt changes
  const savePrompt = async (promptId: string) => {
    const changes = editedPrompts[promptId];
    if (!changes) return;
    
    setIsSaving(prev => ({ ...prev, [promptId]: true }));
    
    try {
      const updatedPrompt = await PromptService.updatePrompt(promptId, changes);
      
      if (updatedPrompt) {
        // Update the prompts list with the new values
        setPrompts(prevPrompts => 
          prevPrompts.map(p => p.id === promptId ? updatedPrompt : p)
        );
        
        // Clear the edited state for this prompt
        setEditedPrompts(prev => {
          const newState = { ...prev };
          delete newState[promptId];
          return newState;
        });
        
        toast.success('Prompt updated successfully');
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      toast.error('Failed to save prompt');
    } finally {
      setIsSaving(prev => ({ ...prev, [promptId]: false }));
    }
  };

  // Check if a prompt has been edited
  const isPromptEdited = (promptId: string): boolean => {
    return !!editedPrompts[promptId];
  };

  // Filter prompts by selected category
  const filteredPrompts = selectedCategory 
    ? prompts.filter(prompt => prompt.category === selectedCategory)
    : prompts;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            System Prompts
          </CardTitle>
          <CardDescription>
            Configure AI prompts used for CV analysis and statement generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedCategory || categories[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {categories.map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="space-y-6 pt-4">
                {filteredPrompts.map(prompt => (
                  <Card key={prompt.id} className="border-muted">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{prompt.title}</CardTitle>
                          <CardDescription>{prompt.description}</CardDescription>
                        </div>
                        {isPromptEdited(prompt.id) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => savePrompt(prompt.id)}
                            disabled={isSaving[prompt.id]}
                          >
                            {isSaving[prompt.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`title-${prompt.id}`}>Title</Label>
                        <Input
                          id={`title-${prompt.id}`}
                          value={editedPrompts[prompt.id]?.title ?? prompt.title}
                          onChange={(e) => handlePromptChange(prompt.id, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`content-${prompt.id}`}>Prompt Content</Label>
                        <Textarea
                          id={`content-${prompt.id}`}
                          value={editedPrompts[prompt.id]?.content ?? prompt.content}
                          onChange={(e) => handlePromptChange(prompt.id, 'content', e.target.value)}
                          className="min-h-[300px] font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`description-${prompt.id}`}>Description</Label>
                        <Input
                          id={`description-${prompt.id}`}
                          value={editedPrompts[prompt.id]?.description ?? prompt.description ?? ''}
                          onChange={(e) => handlePromptChange(prompt.id, 'description', e.target.value)}
                          placeholder="Brief description of this prompt's purpose"
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="flex justify-between w-full items-center text-xs text-muted-foreground">
                        <span>Prompt Key: {prompt.key}</span>
                        <span>Last updated: {new Date(prompt.updated_at).toLocaleString()}</span>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptsTab;

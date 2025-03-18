import { AIModelConfig } from './types';
import { AnalysisService } from './AnalysisService';
import { ExtractionService } from './ExtractionService';
import { StorageService } from '../StorageService';

export class AIService {
  private static models: AIModelConfig[] = [
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      maxTokens: 2048,
      temperature: 0.7,
      enabled: true
    },
    {
      id: 'mixtral-8x7b',
      name: 'Mixtral 8x7B',
      provider: 'Mistral AI',
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true
    }
  ];
  
  private static apiKeys: Record<string, string> = {};
  
  static async initializeApiKeys(): Promise<void> {
    try {
      console.log('Initializing API keys...');
      this.apiKeys = await StorageService.getApiKeys();
      console.log('API keys initialized successfully:', Object.keys(this.apiKeys).length > 0 ? Object.keys(this.apiKeys) : 'No keys found');
    } catch (error) {
      console.error('Failed to initialize API keys:', error);
    }
  }
  
  static setApiKey(provider: string, key: string): void {
    if (!key || !key.trim()) {
      console.warn('Attempted to set empty API key for provider:', provider);
      return;
    }
    
    this.apiKeys[provider.toLowerCase()] = key;
    console.log(`Setting API key for ${provider}`);
    
    // Save to storage
    StorageService.saveApiKey(provider.toLowerCase(), key)
      .catch(error => console.error('Error saving API key:', error));
  }
  
  static getApiKey(provider: string): string | null {
    const key = this.apiKeys[provider.toLowerCase()];
    // Log whether we found a key (but don't log the actual key)
    console.log(`${provider} API key ${key ? 'found' : 'not found'}`);
    return key || null;
  }
  
  static getModels(): AIModelConfig[] {
    return this.models;
  }
  
  static setModelEnabled(modelId: string, enabled: boolean): void {
    const model = this.models.find(m => m.id === modelId);
    if (model) {
      model.enabled = enabled;
    }
  }
  
  // Delegate analysis methods to the specialized services
  static async analyzeCV(...args: Parameters<typeof AnalysisService.analyzeCV>) {
    // Make sure API keys are loaded
    if (Object.keys(this.apiKeys).length === 0) {
      console.log('No API keys found, initializing before analysis...');
      await this.initializeApiKeys();
    }
    
    // After initialization, check if we have the Anthropic key
    const anthropicKey = this.getApiKey('anthropic');
    if (!anthropicKey) {
      console.warn('No Anthropic API key found after initialization');
    }
    
    return AnalysisService.analyzeCV(...args);
  }
  
  static async generateTailoredStatement(...args: Parameters<typeof AnalysisService.generateTailoredStatement>) {
    // Make sure API keys are loaded
    if (Object.keys(this.apiKeys).length === 0) {
      await this.initializeApiKeys();
    }
    return AnalysisService.generateTailoredStatement(...args);
  }
  
  // Helper methods for extracting information directly
  static extractNHSValues(jobDescription: string) {
    return ExtractionService.extractNHSValues(jobDescription);
  }
  
  static extractSkills(cvText: string) {
    return ExtractionService.extractSkills(cvText);
  }
  
  static extractEducation(cvText: string) {
    return ExtractionService.extractEducation(cvText);
  }
  
  static extractRequirements(jobDescription: string) {
    return ExtractionService.extractRequirements(jobDescription);
  }
  
  static extractExperience(cvText: string) {
    return ExtractionService.extractExperience(cvText);
  }
}

// Initialize API keys when module loads
AIService.initializeApiKeys().catch(err => {
  console.warn('Failed to load API keys:', err);
});

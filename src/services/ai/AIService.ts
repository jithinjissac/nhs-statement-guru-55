
import { AIModelConfig } from './types';
import { AnalysisService } from './AnalysisService';
import { ExtractionService } from './ExtractionService';

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
  
  static setApiKey(provider: string, key: string): void {
    this.apiKeys[provider.toLowerCase()] = key;
  }
  
  static getApiKey(provider: string): string | null {
    return this.apiKeys[provider.toLowerCase()] || null;
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
    return AnalysisService.analyzeCV(...args);
  }
  
  static async generateTailoredStatement(...args: Parameters<typeof AnalysisService.generateTailoredStatement>) {
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

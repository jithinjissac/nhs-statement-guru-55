
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
  private static keysInitialized = false;
  private static initializationPromise: Promise<void> | null = null;
  
  static async initializeApiKeys(): Promise<void> {
    // Ensure we don't initialize multiple times simultaneously
    if (this.initializationPromise) {
      console.log('API keys initialization already in progress, waiting...');
      return this.initializationPromise;
    }
    
    if (this.keysInitialized && Object.keys(this.apiKeys).length > 0) {
      console.log('API keys already initialized and loaded');
      return Promise.resolve();
    }
    
    console.log('Initializing API keys...');
    
    // Create a new initialization promise
    this.initializationPromise = new Promise(async (resolve) => {
      try {
        // First check if we already have keys in memory
        if (Object.keys(this.apiKeys).length > 0) {
          console.log('Using API keys already in memory');
          this.keysInitialized = true;
          return resolve();
        }
        
        // Try to load from localStorage first (faster and more reliable)
        const localStorageKeys = await StorageService.getApiKeysFromLocalStorage?.() || {};
        
        if (Object.keys(localStorageKeys).length > 0) {
          console.log('Loaded API keys from localStorage:', Object.keys(localStorageKeys));
          this.apiKeys = { ...this.apiKeys, ...localStorageKeys };
        }
        
        // Then try from StorageService (which handles both DB and localStorage)
        try {
          const storedKeys = await StorageService.getApiKeys();
          if (Object.keys(storedKeys).length > 0) {
            console.log('Loaded API keys from storage service:', Object.keys(storedKeys));
            this.apiKeys = { ...this.apiKeys, ...storedKeys };
          }
        } catch (storageError) {
          console.warn('Non-critical error getting API keys from storage service:', storageError);
          // Continue with keys from localStorage if any
        }
        
        // Fallback to environment variables if needed (for development)
        if (Object.keys(this.apiKeys).length === 0) {
          console.log('No stored API keys found, checking environment variables');
          this.checkEnvironmentVariables();
        }
        
        // Debug check for Anthropic key
        if (this.apiKeys['anthropic']) {
          console.log('Anthropic API key is available in initialized keys');
        } else {
          console.log('Anthropic API key not found in initialized keys');
        }
        
        this.keysInitialized = true;
      } catch (error) {
        console.error('Failed to initialize API keys:', error);
        // Still consider initialization complete even with errors
        this.keysInitialized = true;
      } finally {
        this.initializationPromise = null;
        resolve();
      }
    });
    
    return this.initializationPromise;
  }
  
  private static checkEnvironmentVariables(): void {
    // Check for environment variables
    const providers = ['anthropic', 'openai', 'mistral'];
    
    providers.forEach(provider => {
      const envKey = import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`];
      if (envKey) {
        console.log(`Found ${provider} API key in environment variables`);
        this.apiKeys[provider] = envKey;
        // Also save it to storage for future use
        StorageService.saveApiKey(provider, envKey).catch(err => {
          console.warn(`Non-critical error saving environment API key to storage:`, err);
        });
      }
    });
  }
  
  static setApiKey(provider: string, key: string): void {
    if (!key || !key.trim()) {
      console.warn('Attempted to set empty API key for provider:', provider);
      return;
    }
    
    // Ensure keys are lowercase for consistency
    const providerKey = provider.toLowerCase();
    this.apiKeys[providerKey] = key;
    console.log(`Setting API key for ${provider}`);
    
    // Save to storage
    StorageService.saveApiKey(providerKey, key)
      .catch(error => {
        console.error('Non-critical error saving API key to storage:', error);
        console.log('API key saved to memory but may not be persisted');
      });
  }
  
  static async getApiKey(provider: string): Promise<string | null> {
    // Ensure initialization is complete
    if (!this.keysInitialized) {
      console.log('API keys not initialized yet, initializing now...');
      await this.initializeApiKeys();
    }
    
    const providerKey = provider.toLowerCase();
    const key = this.apiKeys[providerKey];
    
    // Log whether we found a key (but don't log the actual key)
    console.log(`${provider} API key ${key ? 'found' : 'not found'}`);
    
    if (!key) {
      // Try from environment variables as a fallback for development
      const envKey = import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`];
      if (envKey) {
        console.log(`Using ${provider} API key from environment variables`);
        // Cache it for future use
        this.setApiKey(provider, envKey);
        return envKey;
      }
    }
    
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
    if (!this.keysInitialized) {
      console.log('API keys not fully loaded, initializing before analysis...');
      await this.initializeApiKeys();
    }
    
    // After initialization, check if we have the Anthropic key
    const anthropicKey = await this.getApiKey('anthropic');
    if (!anthropicKey) {
      console.warn('No Anthropic API key found after initialization');
      throw new Error('Anthropic API key not found. Please add it in Settings page.');
    } else {
      console.log('Anthropic API key is available for analysis');
    }
    
    return AnalysisService.analyzeCV(...args);
  }
  
  static async generateTailoredStatement(...args: Parameters<typeof AnalysisService.generateTailoredStatement>) {
    // Make sure API keys are loaded
    if (!this.keysInitialized) {
      await this.initializeApiKeys();
    }
    
    // Check for anthropic key
    const anthropicKey = await this.getApiKey('anthropic');
    if (!anthropicKey) {
      throw new Error('Anthropic API key not found. Please add it in Settings page.');
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

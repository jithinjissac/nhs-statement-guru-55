
import { ApiKeyService } from './ApiKeyService';
import { PromptService, SystemPrompt } from '../PromptService';
import { StorageService } from '../StorageService';
import { toast } from 'sonner';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_RETRIES = 3;

export class AnthropicAPI {
  private static async getAnthropicKey(): Promise<string> {
    return ApiKeyService.getApiKey('anthropic');
  }
  
  /**
   * Calls the Anthropic API with the given messages and returns the response
   */
  static async callAnthropic(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    maxTokens: number = 1024,
    temperature: number = 0.7,
    model: string = 'claude-3-sonnet-20240229'
  ) {
    let retries = 0;
    
    // Prepend system message from the database if not already present
    if (!messages.some(msg => msg.role === 'system')) {
      try {
        const systemPrompt = await PromptService.getPromptByKey('system_role');
        if (systemPrompt) {
          messages = [
            { role: 'system', content: systemPrompt.content },
            ...messages
          ];
        }
      } catch (error) {
        console.warn('Failed to fetch system role prompt, continuing without it:', error);
      }
    }
    
    while (retries < MAX_RETRIES) {
      try {
        const anthropicKey = await this.getAnthropicKey();
        
        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Anthropic API call failed (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
        retries++;
        
        // Throw immediately if it's an API key or similar issue
        if (error.toString().toLowerCase().includes('api key') || 
            error.toString().toLowerCase().includes('auth') || 
            error.toString().toLowerCase().includes('401') || 
            error.toString().toLowerCase().includes('403')) {
          throw error;
        }
        
        // If we've reached max retries, throw the error
        if (retries >= MAX_RETRIES) {
          throw error;
        }
        
        // Wait with exponential backoff before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
    
    throw new Error(`Failed to call Anthropic API after ${MAX_RETRIES} attempts`);
  }
  
  /**
   * Gets NHS statement resources from storage or fallback
   */
  static async getNHSStatementResources() {
    try {
      const guidelines = await StorageService.getGuidelines();
      const sampleStatements = await StorageService.getSampleStatements();
      
      return {
        guidelines,
        sampleStatements
      };
    } catch (error) {
      console.error('Error loading NHS resources, using fallbacks:', error);
      return {
        guidelines: [],
        sampleStatements: []
      };
    }
  }
}

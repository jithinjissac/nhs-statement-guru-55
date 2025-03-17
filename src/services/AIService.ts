
export type AIModelConfig = {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
};

export type AIDetectionResult = {
  score: number;
  isAI: boolean;
  confidence: 'low' | 'medium' | 'high';
  detectorName: string;
};

export type StatementGenerationOptions = {
  humanizeLevel: 'low' | 'medium' | 'high';
  tone: 'professional' | 'conversational' | 'enthusiastic';
  detailLevel: 'concise' | 'detailed' | 'comprehensive';
  focusAreas: string[];
};

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
  
  /**
   * Generates an NHS supporting statement based on the CV, job description, and provided guidelines
   */
  static async generateStatement(
    cv: string,
    jobDescription: string,
    guidelines: string[], 
    examples: string[],
    options: StatementGenerationOptions
  ): Promise<string> {
    // In a real implementation, this would call the selected AI API
    // For now, we'll simulate with a delay
    
    // Build prompt
    const prompt = this.buildPrompt(cv, jobDescription, guidelines, examples, options);
    
    // Get enabled models
    const enabledModels = this.models.filter(m => m.enabled);
    if (enabledModels.length === 0) {
      throw new Error('No enabled AI models found. Please configure an API key in settings.');
    }
    
    // In a real app, we would choose a model and call its API
    // For demo, we'll just simulate a delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Return a sample statement
    return `I am writing to express my interest in the [Role Title] position with the NHS. With [X years] of experience in healthcare, I have developed a strong foundation in [key skills from CV that match job description].

Throughout my career, I have consistently demonstrated a commitment to delivering high-quality patient care with empathy and professionalism. For example, at [Previous Position], I [specific achievement that relates to the NHS role].

My experience with [relevant system/process from CV] directly aligns with your requirement for [job description requirement]. I have successfully [quantifiable achievement] which improved [relevant outcome].

I am particularly drawn to this role because of my passion for [aspect of healthcare mentioned in job description]. In my current position, I have [relevant experience that demonstrates alignment with NHS values].

I understand the challenges facing the NHS today and believe my experience in [relevant area] positions me well to contribute effectively to your team. I have developed strong skills in [key requirement from job description], which I demonstrated when [specific example from career].

I am committed to professional development and have recently [relevant training/certification], which has enhanced my ability to [skill relevant to the position].

I believe my values align closely with the NHS Constitution, particularly regarding [specific NHS value], which I demonstrated when [example of putting this value into practice].

I am excited about the opportunity to bring my skills and experience to your team and contribute to the important work you do. I look forward to discussing how I can support your objectives in more detail.`;
  }
  
  /**
   * Builds an optimized prompt for AI text generation
   */
  private static buildPrompt(
    cv: string,
    jobDescription: string,
    guidelines: string[],
    examples: string[],
    options: StatementGenerationOptions
  ): string {
    // In a real implementation, this would construct an appropriate prompt
    // based on the provided content and options
    return `Create an NHS job application supporting statement that sounds natural and human-written.
    
CV: ${cv.substring(0, 1000)}...
Job Description: ${jobDescription.substring(0, 1000)}...
Guidelines: ${guidelines.join('\n')}
Examples: ${examples.join('\n')}

Tone: ${options.tone}
Detail Level: ${options.detailLevel}
Focus Areas: ${options.focusAreas.join(', ')}
Humanize Level: ${options.humanizeLevel}

The supporting statement should:
1. Be tailored specifically to the job description
2. Highlight relevant experience from the CV
3. Demonstrate understanding of NHS values
4. Include specific, concrete examples
5. Avoid AI-like patterns such as repetitive structures
6. Vary sentence length and structure
7. Include appropriate professional language
8. Use first-person perspective naturally
9. Sound conversational yet professional
10. Avoid excessive buzzwords and overly formal language`;
  }
  
  /**
   * Checks if the generated text appears to be AI-written using multiple detection methods
   */
  static async detectAI(text: string): Promise<AIDetectionResult[]> {
    // In a real implementation, this would call AI detection APIs
    // For demo, we'll return simulated results
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return simulated results from different detection tools
    return [
      {
        detectorName: 'ZeroGPT',
        score: 0.23,
        isAI: false,
        confidence: 'medium'
      },
      {
        detectorName: 'GPTZero',
        score: 0.31,
        isAI: false,
        confidence: 'medium'
      },
      {
        detectorName: 'Originality.ai',
        score: 0.19,
        isAI: false,
        confidence: 'high'
      },
      {
        detectorName: 'Sapling',
        score: 0.27,
        isAI: false,
        confidence: 'medium'
      }
    ];
  }
  
  /**
   * Humanizes the generated text to reduce AI detection
   */
  static async humanizeText(text: string, level: 'low' | 'medium' | 'high'): Promise<string> {
    // In a real implementation, this would apply various humanization techniques
    // For demo, we'll just simulate with a delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return the original text (in real app, this would be modified)
    return text;
  }
}

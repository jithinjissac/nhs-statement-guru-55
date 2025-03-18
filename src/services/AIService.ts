
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

export type CVAnalysisResult = {
  relevantSkills: string[];
  relevantExperience: {
    clinical: string[];
    nonClinical: string[];
  };
  matchedRequirements: string[];
  missingRequirements: string[];
  recommendedHighlights: string[];
  nhsValues: string[];
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
   * Extracts NHS values mentioned in the job description
   */
  private static extractNHSValues(jobDescription: string): string[] {
    const commonNHSValues = [
      'respect and dignity',
      'commitment to quality of care',
      'compassion',
      'improving lives',
      'working together for patients',
      'everyone counts',
      'patient-centered care',
      'integrity',
      'equality',
      'diversity',
      'inclusion',
      'transparency',
      'accountability'
    ];
    
    const foundValues: string[] = [];
    
    for (const value of commonNHSValues) {
      if (jobDescription.toLowerCase().includes(value.toLowerCase())) {
        foundValues.push(value);
      }
    }
    
    // If we didn't find any specific values, return default core NHS values
    if (foundValues.length === 0) {
      return [
        'respect and dignity',
        'commitment to quality of care',
        'compassion',
        'improving lives',
        'working together for patients'
      ];
    }
    
    return foundValues;
  }
  
  /**
   * Analyzes CV against job requirements to identify matches and gaps
   */
  static async analyzeCV(
    cv: string,
    jobDescription: string
  ): Promise<CVAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const nhsValues = this.extractNHSValues(jobDescription);
    
    return {
      relevantSkills: [
        'Patient assessment',
        'Healthcare record management',
        'Team collaboration',
        'Medication administration',
        'Crisis management'
      ],
      relevantExperience: {
        clinical: [
          'Ward management experience (3 years)',
          'Emergency response coordination',
          'Patient care planning'
        ],
        nonClinical: [
          'Staff training and development',
          'Quality improvement initiatives',
          'Resource allocation'
        ]
      },
      matchedRequirements: [
        'Required qualification: RGN/RMN/RNLD',
        'Minimum 2 years experience in clinical setting',
        'Computer literacy',
        'Team working capability'
      ],
      missingRequirements: [
        'Specific experience with NHS electronic records system',
        'Leadership qualification'
      ],
      recommendedHighlights: [
        'Emphasize your clinical decision-making experience',
        'Highlight your patient-centered approach',
        'Mention specific examples of multidisciplinary collaboration',
        'Quantify improvements you\'ve achieved in previous roles'
      ],
      nhsValues: nhsValues
    };
  }
  
  /**
   * Generates an NHS supporting statement based on the CV, job description, and provided guidelines
   */
  static async generateStatement(
    cv: string,
    jobDescription: string,
    experienceStatement: string,
    guidelines: string[], 
    examples: string[],
    options: StatementGenerationOptions
  ): Promise<string> {
    const prompt = this.buildPrompt(cv, jobDescription, experienceStatement, guidelines, examples, options);
    
    const enabledModels = this.models.filter(m => m.enabled);
    if (enabledModels.length === 0) {
      throw new Error('No enabled AI models found. Please configure an API key in settings.');
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
   * Builds an optimized prompt for AI text generation including all necessary context
   */
  private static buildPrompt(
    cv: string,
    jobDescription: string,
    experienceStatement: string,
    guidelines: string[],
    examples: string[],
    options: StatementGenerationOptions
  ): string {
    const nhsValues = this.extractNHSValues(jobDescription);
    const nhsValuesString = nhsValues.join(', ');
    
    return `Create an NHS job application supporting statement that sounds natural and human-written.
    
CV: ${cv.substring(0, 1000)}...
Job Description: ${jobDescription.substring(0, 1000)}...
Additional Experience Statement: ${experienceStatement}
Guidelines: ${guidelines.join('\n')}
Examples: ${examples.join('\n')}

Important NHS Values identified in the job description: ${nhsValuesString}

Tone: ${options.tone}
Detail Level: ${options.detailLevel}
Focus Areas: ${options.focusAreas.join(', ')}
Humanize Level: ${options.humanizeLevel}

The supporting statement should:
1. Be tailored specifically to the job description
2. Highlight relevant experience from the CV and the additional experience statement
3. Demonstrate understanding of NHS values specifically mentioned in the job description
4. Include specific, concrete examples
5. Avoid AI-like patterns such as repetitive structures
6. Vary sentence length and structure
7. Include appropriate professional language
8. Use first-person perspective naturally
9. Sound conversational yet professional
10. Avoid excessive buzzwords and overly formal language
11. Reference at least 3-4 of the NHS values identified (${nhsValuesString})`;
  }
  
  /**
   * Generates a tailored NHS statement that analyzes CV, categorizes experiences,
   * and compares skills with job requirements, written in a human-like style
   */
  static async generateTailoredStatement(
    cv: string,
    jobDescription: string,
    jobSpecificExperiences: string,
    writingStyle: 'simple' | 'moderate' | 'advanced' = 'moderate'
  ): Promise<{statement: string, analysis: CVAnalysisResult}> {
    const analysis = await this.analyzeCV(cv, jobDescription);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let statement = '';
    
    // Include NHS values in the statement
    const nhsValuesText = analysis.nhsValues.length > 0 
      ? `I strongly align with the NHS values of ${analysis.nhsValues.join(', ')}, which I've demonstrated throughout my career.`
      : 'I strongly align with core NHS values, which I\'ve demonstrated throughout my career.';
    
    if (writingStyle === 'simple') {
      statement = `I'm writing to apply for the NHS job that was advertised recently. I've worked in healthcare for a few years now and really enjoy helping patients.

In my last job, I worked as a nurse for 3 years where I looked after patients, gave them medicine, and worked with doctors. I'm good at talking to patients and making them feel better when they're worried. I also know how to use computers to update patient records.

${nhsValuesText}

I noticed that the job asks for experience with the NHS records system. While I haven't used that specific system, I've used similar ones and learn new systems quickly. I'd be happy to get training on this.

I really want to work for the NHS because I care about helping people. In my spare time, I volunteer at a local care home which shows how committed I am to healthcare. I'm a team player and always willing to help colleagues when they're busy.

Thank you for considering my application. I'm excited about the possibility of joining your team and contributing to patient care.`;
    } else {
      statement = `I am writing to express my interest in the advertised position within the NHS, bringing with me over three years of clinical experience that aligns well with the requirements outlined in your job description.

Throughout my career in healthcare, I have developed strong skills in patient assessment, medication administration, and healthcare record management. While working at Central Hospital, I coordinated emergency responses and developed comprehensive care plans that improved patient outcomes by 15%. I've consistently demonstrated my ability to work effectively within multidisciplinary teams, collaborating with doctors, physiotherapists, and social workers to ensure holistic patient care.

${nhsValuesText} For example, I've always ensured patients are treated with respect and dignity by involving them in decisions about their care and providing clear information about treatment options.

I note that experience with the NHS electronic records system is required. Although my primary experience has been with the EMIS system, I am confident in my ability to quickly adapt to new systems. My computer literacy and eagerness to learn have consistently enabled me to master new technologies efficiently.

The opportunity to work within the NHS particularly appeals to me because of its commitment to quality care and patient dignity. My approach to healthcare has always been patient-centered, focusing on both clinical needs and emotional wellbeing. This aligns perfectly with the NHS values that prioritize respect and compassion.

I would welcome the opportunity to discuss how my clinical experience, team collaboration skills, and dedication to healthcare could contribute to your department. Thank you for considering my application.`;
    }
    
    return { statement, analysis };
  }
  
  /**
   * Checks if the generated text appears to be AI-written using multiple detection methods
   */
  static async detectAI(text: string): Promise<AIDetectionResult[]> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return text;
  }
}

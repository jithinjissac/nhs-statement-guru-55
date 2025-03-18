
export type AIModelConfig = {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
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
   * Extracts skills from CV text
   */
  private static extractSkills(cvText: string): string[] {
    // Common healthcare skills to look for
    const commonSkills = [
      'patient assessment', 'healthcare record', 'team collaboration', 
      'medication administration', 'crisis management', 'patient care',
      'clinical decision', 'leadership', 'communication', 'time management',
      'electronic health records', 'infection control', 'quality improvement',
      'care planning', 'risk assessment', 'patient advocacy', 'emergency response',
      'mentoring', 'critical thinking', 'resource allocation', 'conflict resolution',
      'documentation', 'research', 'training', 'patient education', 'teamwork'
    ];
    
    const extractedSkills: string[] = [];
    
    for (const skill of commonSkills) {
      if (cvText.toLowerCase().includes(skill.toLowerCase())) {
        // Capitalize first letter of each word
        const formattedSkill = skill
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        extractedSkills.push(formattedSkill);
      }
    }
    
    return extractedSkills;
  }
  
  /**
   * Extracts requirements from job description
   */
  private static extractRequirements(jobDescription: string): string[] {
    const lines = jobDescription.split('\n');
    const requirements: string[] = [];
    
    // Look for sections that might contain requirements
    let inRequirementsSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if we're entering a requirements section
      if (/essential|requirements|qualifications|experience required|person specification/i.test(trimmedLine)) {
        inRequirementsSection = true;
        continue;
      }
      
      // Check if we're leaving a requirements section
      if (inRequirementsSection && /desirable|about us|about the role|responsibilities|duties/i.test(trimmedLine)) {
        inRequirementsSection = false;
      }
      
      // Extract requirements from bullet points or numbered lists
      if (inRequirementsSection && (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || /^\d+\./.test(trimmedLine))) {
        // Clean up the requirement text
        let requirement = trimmedLine.replace(/^[•\-\d\.]+\s*/, '').trim();
        if (requirement.length > 10) { // Ensure it's not just a short fragment
          requirements.push(requirement);
        }
      }
    }
    
    // If we couldn't find requirements in structured sections, try to extract them from keywords
    if (requirements.length === 0) {
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (/must have|required|essential|you will have|you should have|you must have/i.test(trimmedLine)) {
          requirements.push(trimmedLine);
        }
      }
    }
    
    return requirements;
  }
  
  /**
   * Extracts experience from CV
   */
  private static extractExperience(cvText: string): {clinical: string[], nonClinical: string[]} {
    const lines = cvText.split('\n');
    const clinical: string[] = [];
    const nonClinical: string[] = [];
    
    let inExperienceSection = false;
    let currentExperience = '';
    let isClinical = false;
    
    const clinicalKeywords = ['hospital', 'clinic', 'patient', 'nurse', 'doctor', 'medical', 'healthcare', 'health care', 'ward', 'clinical'];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if we're entering an experience section
      if (/experience|employment|work history/i.test(trimmedLine)) {
        inExperienceSection = true;
        continue;
      }
      
      // Check if we're leaving an experience section
      if (inExperienceSection && /education|qualifications|skills|references/i.test(trimmedLine)) {
        // Save any pending experience
        if (currentExperience) {
          if (isClinical) {
            clinical.push(currentExperience);
          } else {
            nonClinical.push(currentExperience);
          }
          currentExperience = '';
        }
        inExperienceSection = false;
        continue;
      }
      
      // Process experience entries
      if (inExperienceSection) {
        // Potential start of a new experience entry (usually has a date)
        if (/\d{4}\s*[-–—]\s*\d{4}|\d{4}\s*[-–—]\s*(present|current|now)/i.test(trimmedLine) || 
            /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(trimmedLine)) {
          
          // Save previous experience if exists
          if (currentExperience) {
            if (isClinical) {
              clinical.push(currentExperience);
            } else {
              nonClinical.push(currentExperience);
            }
          }
          
          // Start new experience
          currentExperience = trimmedLine;
          
          // Determine if clinical or non-clinical
          isClinical = clinicalKeywords.some(keyword => 
            trimmedLine.toLowerCase().includes(keyword.toLowerCase())
          );
          
        } else if (currentExperience && trimmedLine.length > 0) {
          // Continue building current experience
          currentExperience += ' ' + trimmedLine;
          
          // Update clinical status if keywords found
          if (!isClinical) {
            isClinical = clinicalKeywords.some(keyword => 
              trimmedLine.toLowerCase().includes(keyword.toLowerCase())
            );
          }
        }
      }
    }
    
    // Add the last experience if there's one in progress
    if (currentExperience) {
      if (isClinical) {
        clinical.push(currentExperience);
      } else {
        nonClinical.push(currentExperience);
      }
    }
    
    // Limit to 5 experiences max for each category
    return {
      clinical: clinical.slice(0, 5),
      nonClinical: nonClinical.slice(0, 5)
    };
  }
  
  /**
   * Analyzes CV against job requirements to identify matches and gaps
   */
  static async analyzeCV(
    cv: string,
    jobDescription: string
  ): Promise<CVAnalysisResult> {
    console.log("Analyzing CV with text length:", cv.length);
    console.log("Analyzing job description with text length:", jobDescription.length);
    
    // Extract actual data from CV and job description
    const skills = this.extractSkills(cv);
    const experience = this.extractExperience(cv);
    const requirements = this.extractRequirements(jobDescription);
    const nhsValues = this.extractNHSValues(jobDescription);
    
    // Match requirements against CV content
    const matchedRequirements: string[] = [];
    const missingRequirements: string[] = [];
    
    for (const req of requirements) {
      let found = false;
      
      // Check if requirement is in CV text
      if (cv.toLowerCase().includes(req.toLowerCase())) {
        found = true;
      }
      
      // Check against extracted skills
      if (!found) {
        for (const skill of skills) {
          if (req.toLowerCase().includes(skill.toLowerCase())) {
            found = true;
            break;
          }
        }
      }
      
      // Check against extracted experiences
      if (!found) {
        for (const exp of [...experience.clinical, ...experience.nonClinical]) {
          if (exp.toLowerCase().includes(req.toLowerCase())) {
            found = true;
            break;
          }
        }
      }
      
      if (found) {
        matchedRequirements.push(req);
      } else {
        missingRequirements.push(req);
      }
    }
    
    // Generate recommended highlights based on matched requirements and NHS values
    const recommendedHighlights = this.generateRecommendedHighlights(
      matchedRequirements, nhsValues, experience
    );
    
    return {
      relevantSkills: skills,
      relevantExperience: experience,
      matchedRequirements,
      missingRequirements,
      recommendedHighlights,
      nhsValues
    };
  }
  
  /**
   * Generate recommended highlights for the statement
   */
  private static generateRecommendedHighlights(
    matchedRequirements: string[],
    nhsValues: string[],
    experience: {clinical: string[], nonClinical: string[]}
  ): string[] {
    const highlights: string[] = [];
    
    // Highlight NHS values alignment
    if (nhsValues.length > 0) {
      highlights.push(`Emphasize your alignment with NHS values: ${nhsValues.slice(0, 3).join(', ')}`);
    }
    
    // Highlight key matched requirements
    for (let i = 0; i < Math.min(2, matchedRequirements.length); i++) {
      highlights.push(`Provide specific examples of your ${matchedRequirements[i]}`);
    }
    
    // Highlight relevant experience
    if (experience.clinical.length > 0) {
      highlights.push('Quantify your clinical achievements with specific metrics where possible');
    }
    
    if (experience.nonClinical.length > 0) {
      highlights.push('Demonstrate how your non-clinical experience transfers to this role');
    }
    
    // Add general best practices
    highlights.push('Include specific examples that demonstrate your problem-solving abilities');
    
    return highlights;
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
    
    // Extract job title from job description
    const jobTitleMatch = jobDescription.match(/(?:job title|position|role):\s*([^\n]+)/i);
    const jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : "the advertised position";
    
    // Calculate years of experience from CV
    const yearsMatch = cv.match(/(\d+)\s*(?:years|yrs).*experience/i);
    const yearsOfExperience = yearsMatch ? yearsMatch[1] : "several";
    
    // Include NHS values in the statement
    const nhsValuesText = analysis.nhsValues.length > 0 
      ? `I strongly align with the NHS values of ${analysis.nhsValues.join(', ')}, which I've demonstrated throughout my career.`
      : 'I strongly align with core NHS values, which I\'ve demonstrated throughout my career.';
    
    // Generate statement based on analysis and writing style
    let statement = '';
    
    if (writingStyle === 'simple') {
      statement = `I'm writing to apply for ${jobTitle}. I've worked in healthcare for ${yearsOfExperience} years now and really enjoy helping patients.

In my previous roles, I've gained experience in ${analysis.relevantSkills.slice(0, 3).join(', ')}. ${analysis.relevantExperience.clinical.length > 0 ? `My clinical experience includes ${analysis.relevantExperience.clinical[0]}` : ''}

${nhsValuesText}

${analysis.missingRequirements.length > 0 ? `I noticed that the job asks for ${analysis.missingRequirements[0]}. While I haven't had direct experience with this, I'm a quick learner and eager to develop this skill.` : ''}

I really want to work for the NHS because I care about helping people. I'm a team player and always willing to help colleagues when they're busy.

Thank you for considering my application. I'm excited about the possibility of joining your team and contributing to patient care.`;
    } else {
      statement = `I am writing to express my interest in ${jobTitle}, bringing with me ${yearsOfExperience} years of experience that aligns well with the requirements outlined in your job description.

Throughout my career in healthcare, I have developed strong skills in ${analysis.relevantSkills.slice(0, 4).join(', ')}. ${analysis.relevantExperience.clinical.length > 0 ? `My clinical experience includes ${analysis.relevantExperience.clinical.slice(0, 2).join(' and ')}. ` : ''}${analysis.relevantExperience.nonClinical.length > 0 ? `Additionally, I have valuable non-clinical experience in ${analysis.relevantExperience.nonClinical[0]}.` : ''}

${nhsValuesText} For example, I've always ensured patients are treated with respect and dignity by involving them in decisions about their care and providing clear information about treatment options.

${analysis.missingRequirements.length > 0 ? `I note that ${analysis.missingRequirements[0]} is required. Although my primary experience has been in different areas, I am confident in my ability to quickly adapt and learn this aspect of the role.` : ''}

The opportunity to work within the NHS particularly appeals to me because of its commitment to quality care and patient dignity. My approach to healthcare has always been patient-centered, focusing on both clinical needs and emotional wellbeing.

I would welcome the opportunity to discuss how my experience, skills, and dedication to healthcare could contribute to your department. Thank you for considering my application.`;
    }
    
    return { statement, analysis };
  }
}

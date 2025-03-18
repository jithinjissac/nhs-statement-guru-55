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
    administrative: string[];
    yearsOfExperience: number;
  };
  matchedRequirements: {requirement: string, evidence: string}[];
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
   * Extracts requirements from job description, focusing on Person Specification tables
   */
  private static extractRequirements(jobDescription: string): string[] {
    const lines = jobDescription.split('\n');
    const requirements: string[] = [];
    
    // Look specifically for Person Specification sections
    let inRequirementsSection = false;
    let personSpecificationFound = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if we're entering a Person Specification section
      if (/person\s+specification|personal\s+specification|person\s+spec/i.test(trimmedLine)) {
        inRequirementsSection = true;
        personSpecificationFound = true;
        continue;
      }
      
      // Also check for essential requirements sections
      if (!personSpecificationFound && /essential|requirements|qualifications|experience required/i.test(trimmedLine)) {
        inRequirementsSection = true;
        continue;
      }
      
      // Check if we're leaving a requirements section
      if (inRequirementsSection && /desirable|about us|about the role|responsibilities|duties/i.test(trimmedLine) && trimmedLine.length < 50) {
        inRequirementsSection = false;
      }
      
      // Extract requirements from bullet points, numbered lists, or structured tables
      if (inRequirementsSection && 
          (trimmedLine.startsWith('•') || 
           trimmedLine.startsWith('-') || 
           /^\d+\./.test(trimmedLine) ||
           /^[A-Z][A-Za-z\s]+:/.test(trimmedLine) ||
           /^[A-Z][\w\s]+\s+[A-Z][\w\s]+:/.test(trimmedLine))) {
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
   * Calculates approximate years of experience from CV text
   */
  private static calculateYearsOfExperience(cvText: string): number {
    let totalYears = 0;
    const dateRanges = [];
    
    // Regular expressions to find date ranges
    const dateRangeRegex = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*[-–—]\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\bpresent\b|\bcurrent\b)/gi;
    const yearRangeRegex = /\b(20\d{2}|19\d{2})\s*[-–—]\s*(20\d{2}|19\d{2}|\bpresent\b|\bcurrent\b)/gi;
    
    // Extract date ranges with month and year
    let match;
    while ((match = dateRangeRegex.exec(cvText)) !== null) {
      const startDate = match[1];
      const endDate = match[2].toLowerCase() === 'present' || match[2].toLowerCase() === 'current' 
        ? new Date().toDateString() 
        : match[2];
        
      dateRanges.push({ start: startDate, end: endDate });
    }
    
    // Extract date ranges with just years
    while ((match = yearRangeRegex.exec(cvText)) !== null) {
      const startYear = match[1];
      const endYear = match[2].toLowerCase() === 'present' || match[2].toLowerCase() === 'current'
        ? new Date().getFullYear().toString()
        : match[2];
        
      dateRanges.push({ start: startYear, end: endYear });
    }
    
    // Calculate total years from date ranges
    for (const range of dateRanges) {
      try {
        const startYear = parseInt(range.start.match(/\d{4}/)[0]);
        const endYear = parseInt(range.end.match(/\d{4}/)[0]);
        
        if (!isNaN(startYear) && !isNaN(endYear) && endYear >= startYear) {
          totalYears += endYear - startYear;
        }
      } catch (error) {
        // Skip invalid date ranges
        continue;
      }
    }
    
    // If we couldn't calculate years, check for direct mentions of years of experience
    if (totalYears === 0) {
      const yearsExperienceRegex = /(\d+)(?:\+)?\s*years?(?:\s+of)?\s+experience/i;
      const yearsMatch = cvText.match(yearsExperienceRegex);
      
      if (yearsMatch && yearsMatch[1]) {
        totalYears = parseInt(yearsMatch[1]);
      }
    }
    
    return totalYears;
  }
  
  /**
   * Extracts experience from CV
   */
  private static extractExperience(cvText: string): {clinical: string[], nonClinical: string[], administrative: string[], yearsOfExperience: number} {
    const lines = cvText.split('\n');
    const clinical: string[] = [];
    const nonClinical: string[] = [];
    const administrative: string[] = [];
    
    let inExperienceSection = false;
    let currentExperience = '';
    let experienceType = 'unknown';
    
    const clinicalKeywords = ['hospital', 'clinic', 'patient', 'nurse', 'doctor', 'medical', 'healthcare', 'health care', 'ward', 'clinical', 'nhs', 'care home', 'caregiver', 'therapy'];
    const administrativeKeywords = ['admin', 'administrative', 'secretary', 'clerk', 'office', 'receptionist', 'coordinator', 'manager', 'supervisor', 'director', 'assistant'];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if we're entering an experience section
      if (/experience|employment|work history|professional background|career|professional experience/i.test(trimmedLine)) {
        inExperienceSection = true;
        continue;
      }
      
      // Check if we're leaving an experience section
      if (inExperienceSection && /education|qualifications|skills|references|personal profile|interests|hobbies/i.test(trimmedLine)) {
        // Save any pending experience
        if (currentExperience) {
          switch (experienceType) {
            case 'clinical':
              clinical.push(currentExperience);
              break;
            case 'administrative':
              administrative.push(currentExperience);
              break;
            case 'nonClinical':
              nonClinical.push(currentExperience);
              break;
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
            /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\s*[-–—]/i.test(trimmedLine)) {
          
          // Save previous experience if exists
          if (currentExperience) {
            switch (experienceType) {
              case 'clinical':
                clinical.push(currentExperience);
                break;
              case 'administrative':
                administrative.push(currentExperience);
                break;
              case 'nonClinical':
                nonClinical.push(currentExperience);
                break;
            }
          }
          
          // Start new experience
          currentExperience = trimmedLine;
          
          // Determine experience type
          if (clinicalKeywords.some(keyword => 
            trimmedLine.toLowerCase().includes(keyword.toLowerCase())
          )) {
            experienceType = 'clinical';
          } else if (administrativeKeywords.some(keyword => 
            trimmedLine.toLowerCase().includes(keyword.toLowerCase())
          )) {
            experienceType = 'administrative';
          } else {
            experienceType = 'nonClinical';
          }
          
        } else if (currentExperience && trimmedLine.length > 0) {
          // Continue building current experience
          currentExperience += ' ' + trimmedLine;
          
          // Update experience type if keywords found
          if (experienceType === 'unknown' || experienceType === 'nonClinical') {
            if (clinicalKeywords.some(keyword => 
              trimmedLine.toLowerCase().includes(keyword.toLowerCase())
            )) {
              experienceType = 'clinical';
            } else if (administrativeKeywords.some(keyword => 
              trimmedLine.toLowerCase().includes(keyword.toLowerCase())
            )) {
              experienceType = 'administrative';
            }
          }
        }
      }
    }
    
    // Add the last experience if there's one in progress
    if (currentExperience) {
      switch (experienceType) {
        case 'clinical':
          clinical.push(currentExperience);
          break;
        case 'administrative':
          administrative.push(currentExperience);
          break;
        case 'nonClinical':
          nonClinical.push(currentExperience);
          break;
      }
    }
    
    const yearsOfExperience = this.calculateYearsOfExperience(cvText);
    
    return {
      clinical,
      nonClinical,
      administrative,
      yearsOfExperience
    };
  }
  
  /**
   * Analyzes CV against job requirements to identify matches and gaps, including matching keywords
   */
  static async analyzeCV(
    cv: string,
    jobDescription: string,
    additionalExperience: string = ''
  ): Promise<CVAnalysisResult> {
    console.log("Analyzing CV with text length:", cv.length);
    console.log("Analyzing job description with text length:", jobDescription.length);
    
    // Combine CV with additional experience if provided
    const fullCV = additionalExperience ? `${cv}\n\nAdditional Experience:\n${additionalExperience}` : cv;
    
    // Extract actual data from CV and job description
    const skills = this.extractSkills(fullCV);
    const experience = this.extractExperience(fullCV);
    const requirements = this.extractRequirements(jobDescription);
    const nhsValues = this.extractNHSValues(jobDescription);
    
    // Match requirements against CV content with evidence
    const matchedRequirements: {requirement: string, evidence: string}[] = [];
    const missingRequirements: string[] = [];
    
    for (const req of requirements) {
      let found = false;
      let evidence = '';
      
      // Check if requirement is in CV text
      const reqLower = req.toLowerCase();
      const fullCVLower = fullCV.toLowerCase();
      
      if (fullCVLower.includes(reqLower)) {
        found = true;
        
        // Try to find the evidence by locating a sentence containing the requirement
        const sentences = fullCV.match(/[^.!?]+[.!?]+/g) || [];
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(reqLower)) {
            evidence = sentence.trim();
            break;
          }
        }
      }
      
      // If no direct match, check for partial matches
      if (!found) {
        const reqWords = reqLower.split(/\s+/).filter(word => word.length > 3);
        
        for (const reqWord of reqWords) {
          // Skip common words
          if (['with', 'this', 'that', 'have', 'from', 'were', 'what', 'when', 'where', 'which', 'their'].includes(reqWord)) {
            continue;
          }
          
          if (fullCVLower.includes(reqWord)) {
            found = true;
            
            // Find evidence
            const sentences = fullCV.match(/[^.!?]+[.!?]+/g) || [];
            for (const sentence of sentences) {
              if (sentence.toLowerCase().includes(reqWord)) {
                evidence = `"${sentence.trim()}" matches keyword "${reqWord}"`;
                break;
              }
            }
            
            break;
          }
        }
      }
      
      // Check against extracted skills
      if (!found) {
        for (const skill of skills) {
          if (reqLower.includes(skill.toLowerCase())) {
            found = true;
            evidence = `Has skill: ${skill}`;
            break;
          }
        }
      }
      
      // Check against extracted experiences
      if (!found) {
        const allExperiences = [
          ...experience.clinical, 
          ...experience.nonClinical, 
          ...experience.administrative
        ];
        
        for (const exp of allExperiences) {
          if (exp.toLowerCase().includes(reqLower)) {
            found = true;
            evidence = `Experience: ${exp.substring(0, 100)}...`;
            break;
          }
        }
      }
      
      if (found) {
        matchedRequirements.push({requirement: req, evidence: evidence || 'Found in CV'});
      } else {
        missingRequirements.push(req);
      }
    }
    
    // Generate recommended highlights based on matched requirements and NHS values
    const recommendedHighlights = this.generateRecommendedHighlights(
      matchedRequirements.map(item => item.requirement), 
      nhsValues, 
      experience
    );
    
    return {
      relevantSkills: skills,
      relevantExperience: {
        clinical: experience.clinical,
        nonClinical: experience.nonClinical,
        administrative: experience.administrative,
        yearsOfExperience: experience.yearsOfExperience
      },
      matchedRequirements: matchedRequirements,
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
    experience: {clinical: string[], nonClinical: string[], administrative: string[], yearsOfExperience: number}
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
    
    if (experience.administrative.length > 0) {
      highlights.push('Highlight how your administrative skills support healthcare delivery');
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
    additionalExperience: string = '',
    writingStyle: 'simple' | 'moderate' | 'advanced' = 'simple'
  ): Promise<{statement: string, analysis: CVAnalysisResult}> {
    const analysis = await this.analyzeCV(cv, jobDescription, additionalExperience);
    
    // Extract job title from job description
    const jobTitleMatch = jobDescription.match(/(?:job title|position|role):\s*([^\n]+)/i);
    const jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : "the advertised position";
    
    // Get years of experience
    const yearsOfExperience = analysis.relevantExperience.yearsOfExperience || "several";
    
    // Include NHS values in the statement
    const nhsValuesText = analysis.nhsValues.length > 0 
      ? `I strongly align with the NHS values of ${analysis.nhsValues.join(', ')}, which I've demonstrated throughout my career.`
      : 'I strongly align with core NHS values, which I\'ve demonstrated throughout my career.';
    
    // Generate statement based on analysis and writing style
    let statement = '';
    
    if (writingStyle === 'simple' || writingStyle === 'moderate') {
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

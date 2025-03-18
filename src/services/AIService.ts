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
    // Don't rely on hardcoded lists, use AI-based identification
    const commonSkills = [
      'patient assessment', 'healthcare record', 'team collaboration', 
      'medication administration', 'crisis management', 'patient care',
      'clinical decision', 'leadership', 'communication', 'time management',
      'electronic health records', 'infection control', 'quality improvement',
      'care planning', 'risk assessment', 'patient advocacy', 'emergency response',
      'mentoring', 'critical thinking', 'resource allocation', 'conflict resolution',
      'documentation', 'research', 'training', 'patient education', 'teamwork'
    ];
    
    // Extract skills using more advanced text analysis
    const extractedSkills: string[] = [];
    const sentences = cvText.split(/[.!?]+/);
    
    // Look for skill phrases in context
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase().trim();
      
      // Check for skill indicators
      if (sentenceLower.includes('skill') || 
          sentenceLower.includes('proficient') || 
          sentenceLower.includes('experienced in') ||
          sentenceLower.includes('trained in') ||
          sentenceLower.includes('responsible for')) {
        
        // Extract skill from this sentence
        for (const skill of commonSkills) {
          if (sentenceLower.includes(skill)) {
            const formattedSkill = skill
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            if (!extractedSkills.includes(formattedSkill)) {
              extractedSkills.push(formattedSkill);
            }
          }
        }
      }
    }
    
    // Also check for direct mentions of skills
    for (const skill of commonSkills) {
      if (cvText.toLowerCase().includes(skill.toLowerCase())) {
        const formattedSkill = skill
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        if (!extractedSkills.includes(formattedSkill)) {
          extractedSkills.push(formattedSkill);
        }
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
    let isEssential = false;
    let isDesirable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      // Check if we're entering a Person Specification section
      if (/person\s+specification|personal\s+specification|person\s+spec/i.test(trimmedLine)) {
        inRequirementsSection = true;
        personSpecificationFound = true;
        continue;
      }
      
      // Check for essential/desirable headers
      if (inRequirementsSection && /essential(\s+criteria)?|mandatory/i.test(trimmedLine)) {
        isEssential = true;
        isDesirable = false;
        continue;
      }
      
      if (inRequirementsSection && /desirable(\s+criteria)?|preferred/i.test(trimmedLine)) {
        isDesirable = true;
        isEssential = false;
        continue;
      }
      
      // Also check for essential requirements sections if no person spec found
      if (!personSpecificationFound && /essential|requirements|qualifications|experience required/i.test(trimmedLine)) {
        inRequirementsSection = true;
        isEssential = true;
        continue;
      }
      
      // Check if we're leaving a requirements section
      if (inRequirementsSection && /about us|about the role|responsibilities|duties/i.test(trimmedLine) && trimmedLine.length < 50) {
        inRequirementsSection = false;
        isEssential = false;
        isDesirable = false;
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
        
        // Add essential/desirable prefix for clarity
        if (isEssential) {
          requirement = `[Essential] ${requirement}`;
        } else if (isDesirable) {
          requirement = `[Desirable] ${requirement}`;
        }
        
        if (requirement.length > 10) { // Ensure it's not just a short fragment
          requirements.push(requirement);
        }
      }
    }
    
    // If we couldn't find requirements in structured sections, try to extract them from keywords
    if (requirements.length === 0) {
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (/must have|required|essential|you will have|you should have|you must have/i.test(trimmedLine) && trimmedLine.length > 20) {
          requirements.push(`[Essential] ${trimmedLine}`);
        } else if (/desirable|preferred|advantageous|beneficial/i.test(trimmedLine) && trimmedLine.length > 20) {
          requirements.push(`[Desirable] ${trimmedLine}`);
        }
      }
    }
    
    // Ensure requirements are concise
    return requirements.map(req => {
      // If requirement is too long, truncate it
      if (req.length > 100) {
        return req.substring(0, 100) + '...';
      }
      return req;
    });
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
   * Extracts experience from CV with improved identification of clinical, non-clinical, and administrative roles
   */
  private static extractExperience(cvText: string): {clinical: string[], nonClinical: string[], administrative: string[], yearsOfExperience: number} {
    const lines = cvText.split('\n');
    const clinical: string[] = [];
    const nonClinical: string[] = [];
    const administrative: string[] = [];
    
    let inExperienceSection = false;
    let currentJobTitle = '';
    let currentEmployer = '';
    let currentDateRange = '';
    let currentResponsibilities = '';
    let currentType = '';
    
    // AI-based approach to identify role types without relying only on keywords
    const identifyRoleType = (text: string): string => {
      const textLower = text.toLowerCase();
      
      // Clinical indicators
      const clinicalKeywords = ['nurse', 'doctor', 'medical', 'patient', 'clinical', 'care', 'health', 'hospital', 
        'treatment', 'diagnostic', 'therapy', 'therapeutic', 'healthcare', 'ward', 'nhs', 'care home', 'caregiver'];
      
      // Administrative indicators
      const adminKeywords = ['admin', 'administrative', 'office', 'clerk', 'secretary', 'coordinator', 
        'supervisor', 'manager', 'assistant', 'receptionist', 'scheduling', 'documentation'];
      
      // Check for clinical role
      const clinicalScore = clinicalKeywords.filter(word => textLower.includes(word)).length;
      
      // Check for administrative role
      const adminScore = adminKeywords.filter(word => textLower.includes(word)).length;
      
      // Determine role type based on keyword matches
      if (clinicalScore > adminScore && clinicalScore > 0) {
        return 'clinical';
      } else if (adminScore > 0) {
        return 'administrative';
      } else if (textLower.includes('experience') || 
                textLower.includes('work') || 
                textLower.includes('job') || 
                textLower.includes('position') ||
                textLower.includes('role')) {
        return 'nonClinical';
      }
      
      return '';
    };
    
    // Function to process completed job entry
    const processJobEntry = () => {
      if (currentJobTitle || currentEmployer) {
        // Create a concise single-line summary
        let experience = '';
        
        if (currentJobTitle && currentEmployer) {
          experience = `${currentJobTitle} at ${currentEmployer}`;
        } else if (currentJobTitle) {
          experience = currentJobTitle;
        } else if (currentEmployer) {
          experience = `Position at ${currentEmployer}`;
        }
        
        if (currentDateRange) {
          experience += ` (${currentDateRange})`;
        }
        
        // Add a brief description if available
        if (currentResponsibilities) {
          // Only take the first sentence or truncate if too long
          let description = currentResponsibilities.split('.')[0].trim();
          if (description.length > 100) {
            description = description.substring(0, 100) + '...';
          }
          experience += `: ${description}`;
        }
        
        // Skip if empty
        if (experience.trim().length > 0) {
          // Determine category if not already set
          if (!currentType) {
            currentType = identifyRoleType(currentJobTitle + ' ' + currentEmployer + ' ' + currentResponsibilities);
          }
          
          // Add to appropriate list
          switch (currentType) {
            case 'clinical':
              clinical.push(experience);
              break;
            case 'administrative':
              administrative.push(experience);
              break;
            case 'nonClinical':
              nonClinical.push(experience);
              break;
          }
        }
      }
      
      // Reset for next entry
      currentJobTitle = '';
      currentEmployer = '';
      currentDateRange = '';
      currentResponsibilities = '';
      currentType = '';
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if we're entering an experience section
      if (/experience|employment|work history|professional background|career|professional experience/i.test(line) &&
          line.length < 50) {
        inExperienceSection = true;
        continue;
      }
      
      // Check if we're leaving an experience section
      if (inExperienceSection && /education|qualifications|skills|references|personal profile|interests|hobbies/i.test(line) &&
          line.length < 50) {
        // Process any pending job entry
        processJobEntry();
        inExperienceSection = false;
        continue;
      }
      
      // Process experience entries
      if (inExperienceSection && line.length > 0) {
        // Check for date ranges which often indicate start of new experience
        const hasDateRange = /\d{4}\s*[-–—]\s*\d{4}|\d{4}\s*[-–—]\s*(present|current|now)/i.test(line) || 
                           /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\s*[-–—]/i.test(line);
                           
        // Check for job title patterns (often has capital letters or followed by "at")
        const isJobTitle = /^[A-Z][a-z]+ [A-Z][a-z]+|^[A-Z][a-z]+$/.test(line) || 
                           line.includes(' at ') || 
                           /manager|assistant|coordinator|director|supervisor|officer/i.test(line);
        
        if (hasDateRange) {
          // If we already have info, process the previous entry before starting a new one
          if (currentJobTitle || currentEmployer) {
            processJobEntry();
          }
          
          currentDateRange = line;
          
          // Try to identify job title and employer from the same line
          const parts = line.split(/[-–—]/)[0].trim().split(/at|with|for/i);
          if (parts.length > 1) {
            currentJobTitle = parts[0].trim();
            currentEmployer = parts[1].trim();
          }
          
          // Check next line for potential job title if not identified
          if (!currentJobTitle && i+1 < lines.length && lines[i+1].trim().length > 0) {
            const nextLine = lines[i+1].trim();
            if (!/\d{4}/.test(nextLine)) { // Ensure it's not another date
              currentJobTitle = nextLine;
              i++; // Skip this line in next iteration
            }
          }
          
          // Identify role type from what we have so far
          currentType = identifyRoleType(currentJobTitle + ' ' + currentEmployer + ' ' + currentDateRange);
        } 
        else if (isJobTitle && !currentJobTitle) {
          currentJobTitle = line;
          
          // Check if employer is mentioned in the same line
          if (line.includes(' at ')) {
            const parts = line.split(/ at | with | for /i);
            if (parts.length > 1) {
              currentJobTitle = parts[0].trim();
              currentEmployer = parts[1].trim();
            }
          }
          
          // Identify role type from what we have so far
          currentType = identifyRoleType(currentJobTitle + ' ' + currentEmployer);
        }
        else if (currentJobTitle || currentEmployer) {
          // Collect responsibilities/descriptions for current job
          if (currentResponsibilities) {
            currentResponsibilities += ' ' + line;
          } else {
            currentResponsibilities = line;
          }
          
          // If we have a responsibility description, refine our role type
          if (!currentType && currentResponsibilities) {
            currentType = identifyRoleType(currentJobTitle + ' ' + currentEmployer + ' ' + currentResponsibilities);
          }
        }
      }
    }
    
    // Process the last job entry if any
    processJobEntry();
    
    // Calculate years of experience
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
    
    // Extract data from CV and job description
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
      let matchCount = 0;
      
      // Extract the actual requirement text without the [Essential]/[Desirable] prefix
      const reqTextOnly = req.replace(/^\[(Essential|Desirable)\]\s+/, '');
      const reqLower = reqTextOnly.toLowerCase();
      const fullCVLower = fullCV.toLowerCase();
      
      // Break the requirement into significant words (more than 4 chars)
      const reqWords = reqLower.split(/\s+/).filter(word => word.length > 4);
      const matchedWords: string[] = [];
      
      // Check for multiple keyword matches
      for (const reqWord of reqWords) {
        // Skip common words and short words
        if (['with', 'this', 'that', 'have', 'from', 'were', 'what', 'when', 'where', 'which', 'their'].includes(reqWord)) {
          continue;
        }
        
        if (fullCVLower.includes(reqWord)) {
          matchCount++;
          matchedWords.push(reqWord);
        }
      }
      
      // Consider it a match if at least 2 significant words match or 30% of words match
      if (matchCount >= 2 || (reqWords.length > 0 && matchCount / reqWords.length >= 0.3)) {
        found = true;
        evidence = `Matches keywords: ${matchedWords.join(', ')}`;
        
        // Try to find a sentence that contains multiple match words for better evidence
        const sentences = fullCV.match(/[^.!?]+[.!?]+/g) || [];
        for (const sentence of sentences) {
          const sentenceLower = sentence.toLowerCase();
          let sentenceMatchCount = 0;
          
          for (const word of matchedWords) {
            if (sentenceLower.includes(word)) {
              sentenceMatchCount++;
            }
          }
          
          if (sentenceMatchCount >= 2) {
            // Simplify the evidence sentence
            let simplifiedSentence = sentence.trim();
            if (simplifiedSentence.length > 100) {
              simplifiedSentence = simplifiedSentence.substring(0, 100) + '...';
            }
            evidence = simplifiedSentence;
            break;
          }
        }
      }
      
      // Also check against extracted skills
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
            evidence = `Experience: ${exp}`;
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
      highlights.push(`Show how you fit with NHS values like ${nhsValues.slice(0, 2).join(', ')}`);
    }
    
    // Highlight key matched requirements
    for (let i = 0; i < Math.min(2, matchedRequirements.length); i++) {
      highlights.push(`Give examples of your ${matchedRequirements[i].replace(/^\[(Essential|Desirable)\]\s+/, '')}`);
    }
    
    // Highlight relevant experience
    if (experience.clinical.length > 0) {
      highlights.push('Mention your clinical achievements with numbers if you can');
    }
    
    if (experience.nonClinical.length > 0) {
      highlights.push('Explain how your non-clinical experience helps in this job');
    }
    
    if (experience.administrative.length > 0) {
      highlights.push('Show how your admin skills help deliver healthcare');
    }
    
    // Add general best practices
    highlights.push('Include times when you solved problems well');
    
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
      ? `I strongly believe in the NHS values of ${analysis.nhsValues.join(', ')}, which I've shown in my work.`
      : 'I strongly believe in NHS values, which I\'ve shown in my work.';
    
    // Generate statement based on analysis - using GCSE/A-level style writing (simple, clear language)
    let statement = `I'm writing to apply for ${jobTitle}. I've worked in healthcare for ${yearsOfExperience} years and enjoy helping patients.

In my previous roles, I've gained skills in ${analysis.relevantSkills.slice(0, 3).join(', ')}. ${analysis.relevantExperience.clinical.length > 0 ? `My clinical experience includes ${analysis.relevantExperience.clinical.slice(0, 2).join(' and ')}` : ''}

${nhsValuesText}

${analysis.missingRequirements.length > 0 ? `I see that you need ${analysis.missingRequirements[0].replace(/^\[(Essential|Desirable)\]\s+/, '')}. While I don't have direct experience with this, I learn quickly and am eager to develop this skill.` : ''}

I want to work for the NHS because I care about helping people. I work well in a team and always help my colleagues when they're busy.

Thank you for considering my application. I'm excited about the chance to join your team and help patients.`;
    
    return { statement, analysis };
  }
}

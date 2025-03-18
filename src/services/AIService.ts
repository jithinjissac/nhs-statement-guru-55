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
  matchedRequirements: {requirement: string, evidence: string, keywords: string[]}[];
  missingRequirements: string[];
  recommendedHighlights: string[];
  nhsValues: string[];
  education: string[];
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
   * Call to Anthropic API for CV analysis
   */
  private static async callAnthropic(messages: any[], maxTokens: number = 4000): Promise<any> {
    try {
      // We're using the stored secret ANTHROPIC_API_KEY from Supabase
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ANTHROPIC_API_KEY', // This will be replaced by Supabase with the actual secret
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: maxTokens,
          messages: messages
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      throw error;
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
   * Extracts skills from CV text using AI-based identification
   */
  private static extractSkills(cvText: string): string[] {
    const extractedSkills: Set<string> = new Set();
    const sentences = cvText.split(/[.!?]+/);
    
    // Skill indicator phrases
    const skillIndicators = [
      'skill', 'proficient', 'experienced in', 'trained in', 'responsible for',
      'expert in', 'knowledge of', 'competent in', 'familiar with', 'capable of',
      'qualified in', 'specializing in', 'certified in', 'practiced in'
    ];
    
    // Analyze each sentence for skill mentions
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase().trim();
      
      // Check if sentence contains skill indicators
      const hasSkillIndicator = skillIndicators.some(indicator => 
        sentenceLower.includes(indicator)
      );
      
      if (hasSkillIndicator || 
          sentenceLower.includes('skill') || 
          sentenceLower.includes('ability')) {
        
        // Extract potential skills (phrases of 2-4 words)
        const words = sentence.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          // Extract 2-word phrases
          if (i + 1 < words.length) {
            const skill = `${words[i]} ${words[i+1]}`.replace(/[,.;:()]/g, '');
            if (skill.length > 5 && /[A-Z]/.test(skill[0])) {
              extractedSkills.add(skill);
            }
          }
          
          // Extract 3-word phrases
          if (i + 2 < words.length) {
            const skill = `${words[i]} ${words[i+1]} ${words[i+2]}`.replace(/[,.;:()]/g, '');
            if (skill.length > 8 && /[A-Z]/.test(skill[0])) {
              extractedSkills.add(skill);
            }
          }
        }
      }
    }
    
    // Also look for direct skill mentions in CV sections likely to contain skills
    const skillSectionRegex = /\b(skills|abilities|competencies|expertise|qualifications)\b/i;
    const skillSections = cvText.split('\n\n').filter(section => 
      skillSectionRegex.test(section.substring(0, 50))
    );
    
    for (const section of skillSections) {
      const lines = section.split('\n');
      for (const line of lines) {
        if (line.includes('•') || line.includes('-') || /^\s*\d+\./.test(line)) {
          const skill = line.replace(/^[\s•\-\d.]+/, '').trim();
          if (skill.length > 3) {
            extractedSkills.add(skill);
          }
        }
      }
    }
    
    // Convert set to array and limit to most relevant skills (shorter phrases are often more accurate)
    return Array.from(extractedSkills)
      .sort((a, b) => a.length - b.length)
      .slice(0, 15)
      .map(skill => skill.trim());
  }
  
  /**
   * Extracts education qualifications from CV
   */
  private static extractEducation(cvText: string): string[] {
    const education: string[] = [];
    const lines = cvText.split('\n');
    let inEducationSection = false;
    
    // Common education section headers
    const educationHeaders = [
      'education', 'qualifications', 'academic', 'educational background', 
      'academic qualifications', 'academic background', 'degrees'
    ];
    
    // Common degree and qualification names
    const degreeKeywords = [
      'degree', 'bachelor', 'master', 'phd', 'diploma', 'certificate', 
      'graduation', 'msc', 'bsc', 'ba', 'ma', 'md', 'mbbs', 'nursing',
      'nmc', 'registered', 'qualification', 'certified', 'license'
    ];
    
    // Look for education section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      
      // Check if we're entering an education section
      if (!inEducationSection) {
        for (const header of educationHeaders) {
          if (line.includes(header) && line.length < 50) {
            inEducationSection = true;
            break;
          }
        }
      }
      
      // Check if we're leaving the education section
      if (inEducationSection) {
        if (line.match(/^(experience|employment|work history|career|skills|references|interests|hobbies)/i) && line.length < 50) {
          inEducationSection = false;
        }
      }
      
      // Process lines in education section
      if (inEducationSection && line) {
        // Skip the section header
        if (educationHeaders.some(header => line.includes(header) && line.length < 50)) {
          continue;
        }
        
        const hasYear = /\b(19|20)\d{2}\b/.test(line);
        const hasDegree = degreeKeywords.some(keyword => line.includes(keyword));
        
        if ((hasYear || hasDegree) && line.length > 10) {
          education.push(lines[i].trim());
        }
      }
    }
    
    // If we didn't find a dedicated education section, look throughout the CV
    if (education.length === 0) {
      for (const line of lines) {
        const lineLower = line.trim().toLowerCase();
        const hasEducationKeyword = degreeKeywords.some(keyword => lineLower.includes(keyword));
        const hasYear = /\b(19|20)\d{2}\b/.test(lineLower);
        
        if (hasEducationKeyword && hasYear && lineLower.length > 10 && lineLower.length < 100) {
          education.push(line.trim());
        }
      }
    }
    
    // Remove duplicates and keep entries concise
    return [...new Set(education)].map(entry => {
      if (entry.length > 100) {
        return entry.substring(0, 97) + '...';
      }
      return entry;
    });
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
   * Calculates years of experience from date ranges in CV text
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
    const clinical: string[] = [];
    const nonClinical: string[] = [];
    const administrative: string[] = [];
    
    // Split CV by sections and paragraphs
    const sections = cvText.split(/\n\s*\n/);
    
    // Clinical role keywords
    const clinicalKeywords = [
      'nurse', 'doctor', 'medical', 'patient', 'clinical', 'care', 'health', 
      'hospital', 'treatment', 'diagnostic', 'therapy', 'ward', 'nhs', 
      'healthcare', 'surgery', 'clinic', 'physician', 'rehabilitation',
      'emergency', 'maternity', 'midwife', 'pharmacist', 'radiographer'
    ];
    
    // Administrative role keywords
    const adminKeywords = [
      'admin', 'administrative', 'office', 'clerk', 'secretary', 'coordinator', 
      'supervisor', 'manager', 'assistant', 'receptionist', 'scheduling',
      'documentation', 'paperwork', 'filing', 'records', 'reception'
    ];
    
    // Helper function to determine experience type
    const categorizeExperience = (text: string): string => {
      const lowerText = text.toLowerCase();
      
      // Count matches for each category
      const clinicalCount = clinicalKeywords.filter(word => lowerText.includes(word)).length;
      const adminCount = adminKeywords.filter(word => lowerText.includes(word)).length;
      
      // Determine the category based on keyword density
      if (clinicalCount > adminCount && clinicalCount > 0) {
        return 'clinical';
      } else if (adminCount > 0) {
        return 'administrative';
      } else if (lowerText.includes('experience') || 
                 lowerText.includes('work') ||
                 lowerText.includes('job') ||
                 lowerText.includes('position') ||
                 lowerText.includes('role')) {
        return 'nonClinical';
      }
      
      return '';
    };
    
    // Find experience section
    const experienceSections = sections.filter(section => 
      /^(?:experience|employment|work history|career|professional background)/i.test(section.split('\n')[0] || '')
    );
    
    if (experienceSections.length > 0) {
      // Process each experience section
      for (const section of experienceSections) {
        // Split into individual job entries (look for date patterns as separators)
        const jobEntries = section.split(/\n(?=(?:\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}))/i);
        
        for (let i = 1; i < jobEntries.length; i++) { // Skip the header
          const entry = jobEntries[i].trim();
          
          if (entry.length < 10) continue; // Skip too short entries
          
          // Extract just the job title and employer if possible
          const lines = entry.split('\n');
          let jobSummary = '';
          
          // Look for the job title and employer in the first 3 lines
          for (let j = 0; j < Math.min(3, lines.length); j++) {
            if (lines[j].length > 5 && !/^\s*[\-•]/.test(lines[j])) {
              jobSummary = lines[j];
              break;
            }
          }
          
          // If we couldn't find a good summary, use the first line
          if (!jobSummary && lines.length > 0) {
            jobSummary = lines[0];
          }
          
          // Make sure it's not too long
          if (jobSummary.length > 100) {
            jobSummary = jobSummary.substring(0, 97) + '...';
          }
          
          // Categorize the experience
          const category = categorizeExperience(entry);
          
          // Add to appropriate category
          if (category === 'clinical') {
            clinical.push(jobSummary);
          } else if (category === 'administrative') {
            administrative.push(jobSummary);
          } else if (category === 'nonClinical') {
            nonClinical.push(jobSummary);
          }
        }
      }
    } else {
      // Fallback: Try to extract experience without clear section headers
      // Look for date patterns that might indicate job entries
      const lines = cvText.split('\n');
      let currentJob = '';
      let currentEntry = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for date ranges that might indicate start of job entries
        if (/(?:\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s*[-–—]\s*(?:\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|present|current)/i.test(line)) {
          // Save previous job if exists
          if (currentJob && currentEntry) {
            const category = categorizeExperience(currentEntry);
            
            if (category === 'clinical') {
              clinical.push(currentJob);
            } else if (category === 'administrative') {
              administrative.push(currentJob);
            } else if (category === 'nonClinical') {
              nonClinical.push(currentJob);
            }
          }
          
          // Start new job
          currentJob = line;
          currentEntry = line;
          
          // Add job title if on next line
          if (i + 1 < lines.length && lines[i + 1].trim().length > 0 && 
              !/^\s*[\-•]/.test(lines[i + 1]) && !/\d{4}[-–—]/.test(lines[i + 1])) {
            currentJob += ' - ' + lines[i + 1].trim();
            i++; // Skip next line as we've processed it
          }
          
          // Make sure it's not too long
          if (currentJob.length > 100) {
            currentJob = currentJob.substring(0, 97) + '...';
          }
        } else if (currentEntry) {
          // Add to current entry for categorization purposes
          currentEntry += ' ' + line;
        }
      }
      
      // Add last job if exists
      if (currentJob && currentEntry) {
        const category = categorizeExperience(currentEntry);
        
        if (category === 'clinical') {
          clinical.push(currentJob);
        } else if (category === 'administrative') {
          administrative.push(currentJob);
        } else if (category === 'nonClinical') {
          nonClinical.push(currentJob);
        }
      }
    }
    
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
   * Matches requirements against CV content with improved evidence extraction
   */
  private static matchRequirements(
    requirements: string[],
    cv: string,
    additionalExperience: string
  ): { 
    matchedRequirements: {requirement: string, evidence: string, keywords: string[]}[],
    missingRequirements: string[]
  } {
    const fullCV = additionalExperience ? `${cv}\n\nAdditional Experience:\n${additionalExperience}` : cv;
    const matchedRequirements: {requirement: string, evidence: string, keywords: string[]}[] = [];
    const missingRequirements: string[] = [];
    
    for (const req of requirements) {
      // Extract the actual requirement text without the [Essential]/[Desirable] prefix
      const reqTextOnly = req.replace(/^\[(Essential|Desirable)\]\s+/, '');
      const reqLower = reqTextOnly.toLowerCase();
      const fullCVLower = fullCV.toLowerCase();
      
      // Break the requirement into significant words (more than 3 chars)
      const reqWords = reqLower.split(/\s+/).filter(word => word.length > 3);
      const matchedWords: string[] = [];
      
      // Skip common words
      const commonWords = ['with', 'this', 'that', 'have', 'from', 'were', 'what', 'when', 'where', 'which', 'their', 'there', 'these', 'those', 'will', 'should', 'could', 'would', 'able'];
      const filteredReqWords = reqWords.filter(word => !commonWords.includes(word));
      
      // Check for keyword matches
      for (const reqWord of filteredReqWords) {
        if (fullCVLower.includes(reqWord)) {
          matchedWords.push(reqWord);
        }
      }
      
      // Consider it a match if at least 2 significant words match
      if (matchedWords.length >= 2) {
        // Find a relevant sentence from CV as evidence
        const sentences = fullCV.match(/[^.!?]+[.!?]+/g) || [];
        let bestEvidence = '';
        let bestMatchCount = 0;
        
        for (const sentence of sentences) {
          const sentenceLower = sentence.toLowerCase();
          let sentenceMatchCount = 0;
          
          for (const word of matchedWords) {
            if (sentenceLower.includes(word)) {
              sentenceMatchCount++;
            }
          }
          
          if (sentenceMatchCount > bestMatchCount) {
            bestMatchCount = sentenceMatchCount;
            bestEvidence = sentence.trim();
            
            // If we found a sentence with most of the keywords, stop searching
            if (sentenceMatchCount >= matchedWords.length * 0.7) {
              break;
            }
          }
        }
        
        // Simplify and shorten the evidence
        if (bestEvidence) {
          if (bestEvidence.length > 100) {
            bestEvidence = bestEvidence.substring(0, 97) + '...';
          }
        } else {
          // Fallback if no sentence found
          bestEvidence = `Matches keywords: ${matchedWords.join(', ')}`;
        }
        
        matchedRequirements.push({
          requirement: req,
          evidence: bestEvidence,
          keywords: matchedWords
        });
      } else {
        missingRequirements.push(req);
      }
    }
    
    return { matchedRequirements, missingRequirements };
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
   * Analyzes CV against job requirements with improved matching and progress tracking
   */
  static async analyzeCV(
    cv: string,
    jobDescription: string,
    additionalExperience: string = '',
    progressCallback?: (stage: string, percent: number) => void
  ): Promise<CVAnalysisResult> {
    console.log("Analyzing CV with text length:", cv.length);
    console.log("Analyzing job description with text length:", jobDescription.length);
    
    // Update progress
    progressCallback?.('Initializing analysis', 5);
    
    try {
      // Prepare the prompt for Anthropic
      progressCallback?.('Preparing CV analysis', 15);
      
      const messages = [
        {
          role: "user",
          content: `I need you to analyze a CV against a job description to help prepare a supporting statement. Here's the CV:

${cv}

Here's the job description:

${jobDescription}

${additionalExperience ? `Additional context provided by the applicant:
${additionalExperience}` : ''}

Please analyze the CV against the job description and provide a structured JSON response with the following information:
1. Relevant skills found in the CV (list of strings)
2. Relevant experience categorized as: clinical, non-clinical, and administrative (lists of strings), along with estimated years of experience
3. Job requirements from the description that match content in the CV, with specific evidence from the CV
4. Job requirements from the description that are not evidenced in the CV
5. Recommended highlights to focus on in a supporting statement
6. NHS values mentioned in the job description
7. Education qualifications from the CV

Return the response as a valid JSON object with the following structure:
{
  "relevantSkills": ["skill1", "skill2", ...],
  "relevantExperience": {
    "clinical": ["experience1", "experience2", ...],
    "nonClinical": ["experience1", "experience2", ...],
    "administrative": ["experience1", "experience2", ...],
    "yearsOfExperience": number
  },
  "matchedRequirements": [
    {"requirement": "text", "evidence": "text", "keywords": ["keyword1", "keyword2"]}
  ],
  "missingRequirements": ["requirement1", "requirement2", ...],
  "recommendedHighlights": ["highlight1", "highlight2", ...],
  "nhsValues": ["value1", "value2", ...],
  "education": ["qualification1", "qualification2", ...]
}`
        }
      ];
      
      progressCallback?.('Sending to AI service', 30);
      const response = await this.callAnthropic(messages, 4000);
      progressCallback?.('Processing AI response', 70);
      
      // Extract and parse the JSON from the response
      const content = response.content[0].text;
      
      // Find the JSON in the content (may be wrapped in ```json or just plain JSON)
      let jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/{[\s\S]*?}/);
      let jsonString = jsonMatch ? jsonMatch[0] : content;
      
      // Clean up the string to ensure it's valid JSON
      jsonString = jsonString.replace(/```json|```/g, '').trim();
      
      // Parse the JSON response
      const analysis: CVAnalysisResult = JSON.parse(jsonString);
      
      // Complete the progress
      progressCallback?.('Analysis complete', 100);
      
      return analysis;
    } catch (error) {
      console.error('Error in CV analysis:', error);
      throw error;
    }
  }
  
  /**
   * Generates a tailored supporting statement based on CV and job description
   */
  static async generateTailoredStatement(
    cv: string,
    jobDescription: string,
    additional

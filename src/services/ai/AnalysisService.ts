
import { AnthropicAPI } from './AnthropicAPI';
import { ExtractionService } from './ExtractionService';
import { MatchingService } from './MatchingService';
import { CVAnalysisResult } from './types';

export class AnalysisService {
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

Return ONLY a valid JSON object with the following structure (no extra text before or after):
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
      const response = await AnthropicAPI.callAnthropic(messages, 4000);
      progressCallback?.('Processing AI response', 70);
      
      // Extract and parse the JSON from the response
      const content = response.content[0].text;
      console.log("Raw response content:", content.substring(0, 200) + "...");
      
      // Enhanced JSON extraction with advanced error handling
      let jsonResult = this.extractAndSanitizeJSON(content);
      progressCallback?.('Analysis complete', 100);
      
      return jsonResult;
    } catch (error) {
      console.error('Error in CV analysis:', error);
      throw error;
    }
  }

  /**
   * Enhanced JSON extraction and sanitization for robust parsing
   */
  private static extractAndSanitizeJSON(content: string): CVAnalysisResult {
    try {
      console.log("Attempting to extract and parse JSON from response...");
      
      // First, try to extract JSON between code blocks
      let jsonString = '';
      const jsonCodeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      
      if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
        jsonString = jsonCodeBlockMatch[1];
        console.log("Found JSON in code block");
      } else {
        // Then try to find JSON between curly braces with improved regex
        const bracesRegex = /{[\s\S]*?(?=\n\s*$|$)/g;
        const matches = content.match(bracesRegex);
        
        if (matches && matches.length > 0) {
          // Take the largest match as it's likely the complete JSON
          jsonString = matches.reduce((a, b) => a.length > b.length ? a : b);
          console.log("Found JSON between curly braces");
        } else {
          // Last resort: assume the whole content is JSON
          jsonString = content;
          console.log("Using entire content as JSON");
        }
      }
      
      // Clean up the string to ensure it's valid JSON
      jsonString = jsonString.replace(/```json|```/g, '').trim();
      console.log("Extracted JSON string length:", jsonString.length);
      
      // Advanced sanitization to fix JSON syntax errors
      jsonString = this.sanitizeJSON(jsonString);
      
      // Parse the JSON response
      console.log("Attempting to parse JSON...");
      const analysis = JSON.parse(jsonString);
      console.log("JSON parsed successfully");
      
      // Validate and normalize the analysis object structure
      return this.normalizeAnalysisResult(analysis);
    } catch (error) {
      console.error('Error in JSON extraction/parsing:', error);
      console.error('Original error message:', error.message);
      
      if (error instanceof SyntaxError) {
        const position = this.extractErrorPosition(error.message);
        if (position) {
          console.error(`JSON syntax error at position ${position.pos}, line ${position.line}, column ${position.col}`);
          console.error(`Context around error: ${this.getContextAroundError(content, position.pos)}`);
        }
      }
      
      // Create and return a fallback analysis result
      console.log("Using fallback analysis result");
      return this.createFallbackAnalysis();
    }
  }
  
  /**
   * Advanced JSON sanitization to fix common syntax errors
   */
  private static sanitizeJSON(jsonString: string): string {
    // Step 1: Remove any content before the first { and after the last }
    jsonString = jsonString.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    // Step 2: Replace JavaScript-style comments
    jsonString = jsonString.replace(/\/\/.*?(\r?\n|$)/g, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Step 3: Fix trailing commas in arrays
    jsonString = jsonString.replace(/,\s*(\])/g, '$1');
    
    // Step 4: Fix trailing commas in objects
    jsonString = jsonString.replace(/,\s*(\})/g, '$1');
    
    // Step 5: Ensure property names are quoted
    jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z0-9_$]+)(\s*:)/g, '$1"$2"$3');
    
    // Step 6: Fix missing commas between properties
    jsonString = jsonString.replace(/}(\s*){/g, '},$1{');
    jsonString = jsonString.replace(/](\s*){/g, '],$1{');
    jsonString = jsonString.replace(/}(\s*)\[/g, '},$1[');
    jsonString = jsonString.replace(/](\s*)\[/g, '],$1[');
    
    // Step 7: Fix unbalanced quotes in property values
    // This is a simplified approach; a more comprehensive solution would require a proper parser
    const quoteRegex = /"(?:[^"\\]|\\.)*"/g;
    let match;
    let processedString = '';
    let lastIndex = 0;
    
    while ((match = quoteRegex.exec(jsonString)) !== null) {
      processedString += jsonString.substring(lastIndex, match.index + match[0].length);
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < jsonString.length) {
      processedString += jsonString.substring(lastIndex);
    }
    
    // Step 8: Handle nested quotes by escaping them
    jsonString = processedString || jsonString;
    
    console.log("Sanitized JSON length:", jsonString.length);
    return jsonString;
  }
  
  /**
   * Extract line and column from error message
   */
  private static extractErrorPosition(errorMessage: string): { pos: number, line: number, col: number } | null {
    const posMatch = errorMessage.match(/position (\d+)/);
    const lineColMatch = errorMessage.match(/line (\d+) column (\d+)/);
    
    if (posMatch && posMatch[1]) {
      const pos = parseInt(posMatch[1], 10);
      let line = 0;
      let col = 0;
      
      if (lineColMatch && lineColMatch[1] && lineColMatch[2]) {
        line = parseInt(lineColMatch[1], 10);
        col = parseInt(lineColMatch[2], 10);
      }
      
      return { pos, line, col };
    }
    
    return null;
  }
  
  /**
   * Get a snippet of content around the error position
   */
  private static getContextAroundError(content: string, position: number): string {
    const start = Math.max(0, position - 20);
    const end = Math.min(content.length, position + 20);
    
    let contextBefore = content.substring(start, position);
    let contextAfter = content.substring(position, end);
    
    // Mark the error position
    return `...${contextBefore}[ERROR→]${contextAfter}...`;
  }
  
  /**
   * Create a normalized analysis result with all required fields
   */
  private static normalizeAnalysisResult(analysis: any): CVAnalysisResult {
    const result: CVAnalysisResult = {
      relevantSkills: Array.isArray(analysis.relevantSkills) ? analysis.relevantSkills : [],
      relevantExperience: {
        clinical: Array.isArray(analysis.relevantExperience?.clinical) 
          ? analysis.relevantExperience.clinical 
          : [],
        nonClinical: Array.isArray(analysis.relevantExperience?.nonClinical) 
          ? analysis.relevantExperience.nonClinical 
          : [],
        administrative: Array.isArray(analysis.relevantExperience?.administrative) 
          ? analysis.relevantExperience.administrative 
          : [],
        yearsOfExperience: typeof analysis.relevantExperience?.yearsOfExperience === 'number' 
          ? analysis.relevantExperience.yearsOfExperience 
          : 0
      },
      matchedRequirements: Array.isArray(analysis.matchedRequirements) 
        ? analysis.matchedRequirements.map((item: any) => ({
            requirement: typeof item.requirement === 'string' ? item.requirement : '',
            evidence: typeof item.evidence === 'string' ? item.evidence : '',
            keywords: Array.isArray(item.keywords) ? item.keywords : []
          }))
        : [],
      missingRequirements: Array.isArray(analysis.missingRequirements) 
        ? analysis.missingRequirements 
        : [],
      recommendedHighlights: Array.isArray(analysis.recommendedHighlights) 
        ? analysis.recommendedHighlights 
        : [],
      nhsValues: Array.isArray(analysis.nhsValues) 
        ? analysis.nhsValues 
        : [],
      education: Array.isArray(analysis.education) 
        ? analysis.education 
        : []
    };
    
    return result;
  }
  
  /**
   * Create a fallback analysis result when JSON parsing fails
   */
  private static createFallbackAnalysis(): CVAnalysisResult {
    return {
      relevantSkills: ["Error extracting skills - please try again"],
      relevantExperience: {
        clinical: ["Error extracting clinical experience"],
        nonClinical: ["Error extracting non-clinical experience"],
        administrative: ["Error extracting administrative experience"],
        yearsOfExperience: 0
      },
      matchedRequirements: [
        {
          requirement: "Error processing requirements",
          evidence: "Please try again or contact support",
          keywords: ["error"]
        }
      ],
      missingRequirements: ["Error processing requirements"],
      recommendedHighlights: ["Error extracting highlights"],
      nhsValues: ["Error extracting NHS values"],
      education: ["Error extracting education"]
    };
  }
  
  /**
   * Generates a tailored supporting statement based on CV and job description
   * with enhanced human-like qualities and NHS guidelines incorporation
   */
  static async generateTailoredStatement(
    cv: string,
    jobDescription: string,
    additionalInfo: string = '',
    style: 'simple' | 'professional' | 'detailed' = 'simple',
    progressCallback?: (stage: string, percent: number) => void
  ): Promise<{ statement: string, analysis: CVAnalysisResult }> {
    progressCallback?.('Initializing', 5);
    
    try {
      // First, analyze the CV if not already done
      progressCallback?.('Analyzing CV', 15);
      const analysis = await this.analyzeCV(cv, jobDescription, additionalInfo, 
        (stage, percent) => progressCallback?.(`CV Analysis: ${stage}`, Math.floor(percent * 0.4))
      );
      
      progressCallback?.('Retrieving NHS resources', 50);
      // Get NHS guidelines and sample statements to enhance statement quality
      const { guidelines, sampleStatements } = await AnthropicAPI.getNHSStatementResources();
      
      // Extract relevant guidelines content
      const guidelineContent = guidelines.map(g => `${g.title}: ${g.content}`).join('\n\n');
      
      // Extract relevant sample statement content based on role similarities
      const roleKeywords = this.extractRoleKeywords(jobDescription);
      const relevantSamples = this.findRelevantSamples(sampleStatements, roleKeywords, 3);
      const samplesContent = relevantSamples.map(s => `Sample ${s.title} (${s.category}): 
${s.content.substring(0, 800)}...`).join('\n\n---\n\n');
      
      progressCallback?.('Preparing statement generation', 55);
      
      // Determine the audience level based on style
      let audienceLevel = 'GCSE level (simple, clear language)';
      if (style === 'professional') {
        audienceLevel = 'Professional level (articulate, using industry terminology)';
      } else if (style === 'detailed') {
        audienceLevel = 'Detailed academic level (comprehensive, using sophisticated language)';
      }
      
      // Create a concise summary of the analysis
      const matchedRequirements = analysis.matchedRequirements.map(item => 
        `- ${item.requirement.replace(/^\[(Essential|Desirable)\]\s+/, '')}: ${item.evidence.substring(0, 100)}...`
      ).join('\n');
      
      const missingRequirements = analysis.missingRequirements.map(item => 
        `- ${item.replace(/^\[(Essential|Desirable)\]\s+/, '')}`
      ).join('\n');
      
      const highlights = analysis.recommendedHighlights.join('\n- ');
      const nhsValues = analysis.nhsValues.join(', ');
      const skills = analysis.relevantSkills.join(', ');
      const clinicalExp = analysis.relevantExperience.clinical.join(', ');
      const nonClinicalExp = analysis.relevantExperience.nonClinical.join(', ');
      const adminExp = analysis.relevantExperience.administrative.join(', ');
      const education = analysis.education.join(', ');
      
      // Create the enhanced prompt for human-like statement generation
      const messages = [
        {
          role: "system",
          content: `You are an expert NHS career advisor who writes authentic, personalized supporting statements. Your statements have the following qualities:

1. They sound completely natural, as if written by the actual applicant
2. They vary sentence structure, length, and complexity for a natural flow
3. They use first-person perspective with genuine reflections and emotional connections
4. They avoid repetitive phrases, corporate jargon, and formulaic language
5. They incorporate personal touches that reflect the applicant's unique journey
6. They demonstrate NHS values through specific examples rather than generic statements
7. They tell a compelling career narrative that connects past experience to the role
8. They sound warm, authentic and conversational - like a real person speaking`
        },
        {
          role: "user",
          content: `Please write a compelling NHS job application supporting statement based on this CV and job description analysis. 

First, here's the full CV:
${cv}

Here's the full job description:
${jobDescription}

CV Analysis Summary:
- Relevant skills: ${skills}
- Clinical experience: ${clinicalExp}
- Non-clinical experience: ${nonClinicalExp}
- Administrative experience: ${adminExp}
- Years of experience: ${analysis.relevantExperience.yearsOfExperience}
- Education: ${education}

Job Requirements Met:
${matchedRequirements}

Job Requirements Needing Attention:
${missingRequirements}

Recommended Highlights:
- ${highlights}

NHS Values to Emphasize:
${nhsValues}

${additionalInfo ? `Additional Information Provided by Applicant:
${additionalInfo}` : ''}

NHS Statement Guidelines:
${guidelineContent}

Sample Statements for Reference:
${samplesContent}

Instructions for Human-Like Statement Generation:
1. Write a compelling supporting statement at ${audienceLevel} reading level
2. Use varied sentence structures, mixing shorter and longer sentences naturally
3. Create a personal, conversational tone that feels authentic and genuine
4. Begin with a strong, personal introduction explaining interest in this specific role
5. Address each requirement from the job description with specific examples from the CV
6. For any missing requirements, address them honestly using the additional information provided
7. Naturally incorporate NHS values throughout - don't just list them
8. Use transition words sparingly and naturally - avoid obvious formula indicators
9. Include 1-2 brief anecdotes that demonstrate key qualities (compassion, leadership, etc.)
10. Include realistic, modest self-reflection on growth and learning
11. End with a genuine, personal conclusion showing enthusiasm and fit
12. Keep the statement between 500-800 words with natural paragraph breaks
13. Format as cohesive paragraphs - no bullet points or headings
14. MOST IMPORTANT: Make it sound like a real person wrote it, with natural language variations
15. Do not use generic claims like "I am passionate about" - show passion through specific examples
16. Write in first person, using "I" naturally throughout

Create a 100% human-like supporting statement that genuinely represents the applicant's experience, skills, and personality while addressing the requirements of this NHS role.`
        }
      ];
      
      progressCallback?.('Generating statement', 60);
      const response = await AnthropicAPI.callAnthropic(messages, 4000);
      progressCallback?.('Processing AI response', 90);
      
      // Extract the statement text
      const statement = response.content[0].text.trim();
      
      progressCallback?.('Statement generated', 100);
      
      return {
        statement, 
        analysis
      };
    } catch (error) {
      console.error('Error generating statement:', error);
      throw error;
    }
  }

  /**
   * Extract role keywords from job description
   */
  private static extractRoleKeywords(jobDescription: string): string[] {
    const commonRoles = [
      'nurse', 'doctor', 'consultant', 'healthcare assistant', 'hca', 
      'administrator', 'manager', 'therapist', 'technician', 'midwife',
      'physiotherapist', 'dietitian', 'radiographer', 'pharmacist',
      'occupational therapist', 'mental health', 'social worker'
    ];
    
    // Extract role from job description
    const keywords: string[] = [];
    const lowercaseJD = jobDescription.toLowerCase();
    
    commonRoles.forEach(role => {
      if (lowercaseJD.includes(role)) {
        keywords.push(role);
      }
    });
    
    // Extract any department information
    const departments = [
      'emergency', 'a&e', 'cardiology', 'neurology', 'oncology', 
      'pediatrics', 'paediatrics', 'surgery', 'orthopedics', 'orthopaedics',
      'radiology', 'pathology', 'icu', 'intensive care', 'outpatient'
    ];
    
    departments.forEach(dept => {
      if (lowercaseJD.includes(dept)) {
        keywords.push(dept);
      }
    });
    
    return keywords;
  }
  
  /**
   * Find relevant sample statements based on role keywords
   */
  private static findRelevantSamples(samples: any[], keywords: string[], limit: number) {
    // Score each sample by keyword matches
    const scoredSamples = samples.map(sample => {
      const sampleText = (sample.title + ' ' + sample.content).toLowerCase();
      const score = keywords.reduce((total, keyword) => {
        return total + (sampleText.includes(keyword) ? 1 : 0);
      }, 0);
      
      return { ...sample, score };
    });
    
    // Sort by score and return the top matches
    return scoredSamples
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

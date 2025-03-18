
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
      
      // Enhanced JSON extraction with robust error handling
      let jsonString = '';
      try {
        // First try to extract JSON between code blocks
        const jsonCodeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
          jsonString = jsonCodeBlockMatch[1];
        } else {
          // Then try to find JSON between curly braces
          const jsonBracesMatch = content.match(/{[\s\S]*?}/);
          if (jsonBracesMatch) {
            jsonString = jsonBracesMatch[0];
          } else {
            // Last resort: assume the whole content is JSON
            jsonString = content;
          }
        }
        
        // Clean up the string to ensure it's valid JSON
        jsonString = jsonString.replace(/```json|```/g, '').trim();
        
        // Log a subset of the JSON for debugging
        console.log("Extracted JSON string (first 200 chars):", jsonString.substring(0, 200) + "...");
        
        // Attempt to sanitize potential formatting issues that can break JSON
        jsonString = jsonString
          // Fix trailing commas in arrays and objects
          .replace(/,\s*}/g, '}')
          .replace(/,\s*\]/g, ']')
          // Fix missing commas between properties
          .replace(/"\s*{/g, '",{')
          .replace(/"\s*\[/g, '",[')
          // Fix unquoted property names
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
        
        // Parse the JSON response
        const analysis: CVAnalysisResult = JSON.parse(jsonString);
        
        // Validate the analysis object has the expected structure
        if (!analysis.relevantSkills) analysis.relevantSkills = [];
        if (!analysis.relevantExperience) {
          analysis.relevantExperience = {
            clinical: [],
            nonClinical: [],
            administrative: [],
            yearsOfExperience: 0
          };
        }
        if (!analysis.relevantExperience.clinical) analysis.relevantExperience.clinical = [];
        if (!analysis.relevantExperience.nonClinical) analysis.relevantExperience.nonClinical = [];
        if (!analysis.relevantExperience.administrative) analysis.relevantExperience.administrative = [];
        if (!analysis.matchedRequirements) analysis.matchedRequirements = [];
        if (!analysis.missingRequirements) analysis.missingRequirements = [];
        if (!analysis.recommendedHighlights) analysis.recommendedHighlights = [];
        if (!analysis.nhsValues) analysis.nhsValues = [];
        if (!analysis.education) analysis.education = [];

        // Complete the progress
        progressCallback?.('Analysis complete', 100);
        
        return analysis;
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        console.error('Attempted to parse string:', jsonString);
        console.error('Original content:', content);
        
        // Create a fallback analysis result when JSON parsing fails
        const fallbackAnalysis: CVAnalysisResult = {
          relevantSkills: ["Failed to extract skills from CV"],
          relevantExperience: {
            clinical: ["Could not extract clinical experience"],
            nonClinical: ["Could not extract non-clinical experience"],
            administrative: ["Could not extract administrative experience"],
            yearsOfExperience: 0
          },
          matchedRequirements: [
            {
              requirement: "Error processing requirements matching",
              evidence: "Please try again or upload a different CV format",
              keywords: ["error"]
            }
          ],
          missingRequirements: ["Error processing requirements"],
          recommendedHighlights: ["Error extracting highlights"],
          nhsValues: ["Unable to extract NHS values"],
          education: ["Unable to extract education details"]
        };
        
        // Throw a more informative error
        throw new Error(`Failed to parse AI response into valid JSON: ${jsonError.message}`);
      }
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
      
      progressCallback?.('Preparing statement generation', 45);
      
      // Determine the audience level based on style
      let audienceLevel = 'GCSE level (simple, clear language)';
      if (style === 'professional') {
        audienceLevel = 'Professional level (articulate, using industry terminology)';
      } else if (style === 'detailed') {
        audienceLevel = 'Detailed academic level (comprehensive, using sophisticated language)';
      }
      
      // Create a concise summary of the analysis
      const matchedRequirements = analysis.matchedRequirements.map(item => 
        `- ${item.requirement.replace(/^\[(Essential|Desirable)\]\s+/, '')}`
      ).join('\n');
      
      const missingRequirements = analysis.missingRequirements.map(item => 
        `- ${item.replace(/^\[(Essential|Desirable)\]\s+/, '')}`
      ).join('\n');
      
      const highlights = analysis.recommendedHighlights.join('\n- ');
      const nhsValues = analysis.nhsValues.join(', ');
      
      // Create the prompt
      const messages = [
        {
          role: "user",
          content: `Please write a compelling NHS job application supporting statement based on this analysis of a CV against a job description.

CV Summary:
- Relevant skills: ${analysis.relevantSkills.join(', ')}
- Clinical experience: ${analysis.relevantExperience.clinical.join(', ')}
- Non-clinical experience: ${analysis.relevantExperience.nonClinical.join(', ')}
- Administrative experience: ${analysis.relevantExperience.administrative.join(', ')}
- Years of experience: ${analysis.relevantExperience.yearsOfExperience}
- Education: ${analysis.education.join(', ')}

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

Instructions:
1. Write a compelling supporting statement at ${audienceLevel} reading level
2. Focus on how the applicant's experience and skills match the job requirements
3. Address the NHS values specifically
4. Don't mention "CV" or "resume" directly; write in first person ("I have...")
5. Include specific achievements with numbers where possible
6. Acknowledge and address any gaps in meeting requirements
7. Keep the statement between 500-800 words
8. Format with clear paragraphs
9. Do not use bullet points; write in proper prose
10. Start with a brief introduction about why you're interested in the role`
        }
      ];
      
      progressCallback?.('Generating statement', 50);
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
}

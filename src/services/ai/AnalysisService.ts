
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
      const response = await AnthropicAPI.callAnthropic(messages, 4000);
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

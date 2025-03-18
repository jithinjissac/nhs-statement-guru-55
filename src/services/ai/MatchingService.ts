
export class MatchingService {
  /**
   * Matches requirements against CV content with improved evidence extraction
   */
  static matchRequirements(
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
  static generateRecommendedHighlights(
    matchedRequirements: any[],
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
      const requirement = typeof matchedRequirements[i] === 'string' 
        ? matchedRequirements[i] 
        : matchedRequirements[i].requirement;
        
      highlights.push(`Give examples of your ${requirement.replace(/^\[(Essential|Desirable)\]\s+/, '')}`);
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
}

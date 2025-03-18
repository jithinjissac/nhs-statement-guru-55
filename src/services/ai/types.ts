
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

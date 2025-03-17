
export type Guideline = {
  id: string;
  title: string;
  content: string;
  dateAdded: string;
};

export type SampleStatement = {
  id: string;
  title: string;
  content: string;
  category: string;
  dateAdded: string;
};

export class StorageService {
  private static readonly GUIDELINES_KEY = 'nhs_statement_guidelines';
  private static readonly SAMPLES_KEY = 'nhs_statement_samples';
  private static readonly SETTINGS_KEY = 'nhs_statement_settings';
  
  /**
   * Save a guideline to storage
   */
  static saveGuideline(guideline: Guideline): void {
    const guidelines = this.getGuidelines();
    const existingIndex = guidelines.findIndex(g => g.id === guideline.id);
    
    if (existingIndex >= 0) {
      guidelines[existingIndex] = guideline;
    } else {
      guidelines.push(guideline);
    }
    
    localStorage.setItem(this.GUIDELINES_KEY, JSON.stringify(guidelines));
  }
  
  /**
   * Get all guidelines
   */
  static getGuidelines(): Guideline[] {
    const storedData = localStorage.getItem(this.GUIDELINES_KEY);
    if (!storedData) return [];
    
    try {
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to parse guidelines:', error);
      return [];
    }
  }
  
  /**
   * Delete a guideline
   */
  static deleteGuideline(id: string): void {
    const guidelines = this.getGuidelines();
    const updatedGuidelines = guidelines.filter(g => g.id !== id);
    localStorage.setItem(this.GUIDELINES_KEY, JSON.stringify(updatedGuidelines));
  }
  
  /**
   * Save a sample statement
   */
  static saveSampleStatement(sample: SampleStatement): void {
    const samples = this.getSampleStatements();
    const existingIndex = samples.findIndex(s => s.id === sample.id);
    
    if (existingIndex >= 0) {
      samples[existingIndex] = sample;
    } else {
      samples.push(sample);
    }
    
    localStorage.setItem(this.SAMPLES_KEY, JSON.stringify(samples));
  }
  
  /**
   * Get all sample statements
   */
  static getSampleStatements(): SampleStatement[] {
    const storedData = localStorage.getItem(this.SAMPLES_KEY);
    if (!storedData) return [];
    
    try {
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to parse sample statements:', error);
      return [];
    }
  }
  
  /**
   * Delete a sample statement
   */
  static deleteSampleStatement(id: string): void {
    const samples = this.getSampleStatements();
    const updatedSamples = samples.filter(s => s.id !== id);
    localStorage.setItem(this.SAMPLES_KEY, JSON.stringify(updatedSamples));
  }
  
  /**
   * Save settings
   */
  static saveSettings(settings: Record<string, any>): void {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }
  
  /**
   * Get settings
   */
  static getSettings(): Record<string, any> {
    const storedData = localStorage.getItem(this.SETTINGS_KEY);
    if (!storedData) return {};
    
    try {
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to parse settings:', error);
      return {};
    }
  }
}

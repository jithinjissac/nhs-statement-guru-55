
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AdditionalInformationProps {
  additionalExperience: string;
  setAdditionalExperience: (value: string) => void;
  additionalQualifications: string;
  setAdditionalQualifications: (value: string) => void;
  additionalSkills: string;
  setAdditionalSkills: (value: string) => void;
  onUpdate: () => void;
  isAnalyzing: boolean;
}

const AdditionalInformation: React.FC<AdditionalInformationProps> = ({
  additionalExperience,
  setAdditionalExperience,
  additionalQualifications,
  setAdditionalQualifications,
  additionalSkills,
  setAdditionalSkills,
  onUpdate,
  isAnalyzing
}) => {
  return (
    <Card className="border border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Additional Information</CardTitle>
        <CardDescription>
          Add any relevant information not mentioned in your CV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="additionalExperience">Additional Experience</Label>
          <Textarea
            id="additionalExperience"
            placeholder="Describe any additional experiences relevant to this job that may not be in your CV..."
            value={additionalExperience}
            onChange={(e) => setAdditionalExperience(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <div>
          <Label htmlFor="additionalQualifications">Additional Qualifications</Label>
          <Textarea
            id="additionalQualifications"
            placeholder="List any additional qualifications not mentioned in your CV..."
            value={additionalQualifications}
            onChange={(e) => setAdditionalQualifications(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <div>
          <Label htmlFor="additionalSkills">Additional Skills</Label>
          <Textarea
            id="additionalSkills"
            placeholder="List any additional skills not mentioned in your CV..."
            value={additionalSkills}
            onChange={(e) => setAdditionalSkills(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button 
            variant="outline" 
            onClick={onUpdate} 
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Analysis...
              </>
            ) : (
              <>Update Analysis</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdditionalInformation;

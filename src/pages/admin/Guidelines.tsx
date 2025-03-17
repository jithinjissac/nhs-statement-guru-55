
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, FileText, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { StorageService, Guideline } from '@/services/StorageService';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

const AdminGuidelines: React.FC = () => {
  const [guidelines, setGuidelines] = useState<Guideline[]>(StorageService.getGuidelines());
  const [newGuidelineTitle, setNewGuidelineTitle] = useState('');
  const [newGuidelineContent, setNewGuidelineContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentGuidelineId, setCurrentGuidelineId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewGuideline, setPreviewGuideline] = useState<Guideline | null>(null);
  
  const isMobile = useIsMobile();
  
  const resetForm = () => {
    setNewGuidelineTitle('');
    setNewGuidelineContent('');
    setIsEditing(false);
    setCurrentGuidelineId(null);
  };
  
  const handleGuidelineSubmit = () => {
    if (!newGuidelineTitle.trim() || !newGuidelineContent.trim()) {
      toast.error('Please enter both title and content');
      return;
    }
    
    if (isEditing && currentGuidelineId) {
      // Update existing guideline
      const updatedGuideline: Guideline = {
        id: currentGuidelineId,
        title: newGuidelineTitle,
        content: newGuidelineContent,
        dateAdded: new Date().toISOString()
      };
      
      StorageService.saveGuideline(updatedGuideline);
      setGuidelines(StorageService.getGuidelines());
      toast.success('Guideline updated successfully');
    } else {
      // Add new guideline
      const newGuideline: Guideline = {
        id: uuidv4(),
        title: newGuidelineTitle,
        content: newGuidelineContent,
        dateAdded: new Date().toISOString()
      };
      
      StorageService.saveGuideline(newGuideline);
      setGuidelines(StorageService.getGuidelines());
      toast.success('Guideline added successfully');
    }
    
    resetForm();
  };
  
  const handleEditGuideline = (guideline: Guideline) => {
    setIsEditing(true);
    setCurrentGuidelineId(guideline.id);
    setNewGuidelineTitle(guideline.title);
    setNewGuidelineContent(guideline.content);
  };
  
  const handleDeleteGuideline = (id: string) => {
    StorageService.deleteGuideline(id);
    setGuidelines(StorageService.getGuidelines());
    toast.success('Guideline deleted successfully');
  };
  
  const handlePreviewGuideline = (guideline: Guideline) => {
    setPreviewGuideline(guideline);
    setIsPreviewOpen(true);
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">NHS Guidelines Management</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Guideline
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Guideline' : 'Add New Guideline'}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? 'Update this NHS supporting statement guideline'
                  : 'Add a new NHS supporting statement guideline for users'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Guideline Title</Label>
                <Input
                  id="title"
                  placeholder="E.g., Addressing NHS Values"
                  value={newGuidelineTitle}
                  onChange={(e) => setNewGuidelineTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Guideline Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter the guideline content..."
                  className="min-h-[200px]"
                  value={newGuidelineContent}
                  onChange={(e) => setNewGuidelineContent(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleGuidelineSubmit}>
                {isEditing ? 'Update Guideline' : 'Add Guideline'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guidelines.length > 0 ? (
          guidelines.map((guideline) => (
            <Card key={guideline.id} className="hover-lift">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  {guideline.title}
                </CardTitle>
                <CardDescription>
                  Added: {new Date(guideline.dateAdded).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-3">
                  {guideline.content}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePreviewGuideline(guideline)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditGuideline(guideline)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the guideline "{guideline.title}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-500 hover:bg-red-600"
                        onClick={() => handleDeleteGuideline(guideline.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Guidelines Yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Add your first NHS supporting statement guideline to help users create effective statements.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Guideline
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                {/* Same content as the add dialog above */}
                <DialogHeader>
                  <DialogTitle>Add New Guideline</DialogTitle>
                  <DialogDescription>
                    Add a new NHS supporting statement guideline for users
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Guideline Title</Label>
                    <Input
                      id="title"
                      placeholder="E.g., Addressing NHS Values"
                      value={newGuidelineTitle}
                      onChange={(e) => setNewGuidelineTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Guideline Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Enter the guideline content..."
                      className="min-h-[200px]"
                      value={newGuidelineContent}
                      onChange={(e) => setNewGuidelineContent(e.target.value)}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleGuidelineSubmit}>
                    Add Guideline
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      
      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className={isMobile ? "w-[95vw] max-w-full" : "max-w-3xl"}>
          <DialogHeader>
            <DialogTitle>{previewGuideline?.title || 'Guideline Preview'}</DialogTitle>
            <DialogDescription>
              Added: {previewGuideline ? new Date(previewGuideline.dateAdded).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 whitespace-pre-wrap">
              {previewGuideline?.content || ''}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGuidelines;

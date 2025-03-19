
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, FileText, Edit, Eye, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { StorageService, SampleStatement } from '@/services/StorageService';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDropzone } from 'react-dropzone';
import { FileProcessingService } from '@/services/FileProcessingService';

const AdminSampleStatements: React.FC = () => {
  const [samples, setSamples] = useState<SampleStatement[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('clinical');
  const [newContent, setNewContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSample, setPreviewSample] = useState<SampleStatement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const isMobile = useIsMobile();
  
  useEffect(() => {
    fetchSampleStatements();
  }, []);
  
  const fetchSampleStatements = async () => {
    setIsLoading(true);
    try {
      const data = await StorageService.getSampleStatements();
      setSamples(data);
    } catch (error) {
      toast.error('Failed to load sample statements');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setNewTitle('');
    setNewCategory('clinical');
    setNewContent('');
    setIsEditing(false);
    setCurrentId(null);
    setIsDialogOpen(false);
  };
  
  const handleSubmit = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please enter both title and content');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isEditing && currentId) {
        const updatedSample: SampleStatement = {
          id: currentId,
          title: newTitle,
          content: newContent,
          category: newCategory,
          dateAdded: new Date().toISOString()
        };
        
        await StorageService.saveSampleStatement(updatedSample);
        toast.success('Sample statement updated successfully');
      } else {
        const newSample: SampleStatement = {
          id: uuidv4(),
          title: newTitle,
          content: newContent,
          category: newCategory,
          dateAdded: new Date().toISOString()
        };
        
        await StorageService.saveSampleStatement(newSample);
        toast.success('Sample statement added successfully');
      }
      
      resetForm();
      fetchSampleStatements();
    } catch (error) {
      toast.error('Failed to save sample statement');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (sample: SampleStatement) => {
    setIsEditing(true);
    setCurrentId(sample.id);
    setNewTitle(sample.title);
    setNewCategory(sample.category);
    setNewContent(sample.content);
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
      await StorageService.deleteSampleStatement(id);
      toast.success('Sample statement deleted successfully');
      fetchSampleStatements();
    } catch (error) {
      toast.error('Failed to delete sample statement');
      console.error(error);
    }
  };
  
  const handlePreview = (sample: SampleStatement) => {
    setPreviewSample(sample);
    setIsPreviewOpen(true);
  };
  
  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      const file = acceptedFiles[0];
      const processedFile = await FileProcessingService.processFile(file);
      
      const titleFromFilename = file.name.replace(/\.[^/.]+$/, "");
      
      setNewTitle(titleFromFilename);
      setNewContent(processedFile.content);
      toast.success('File processed successfully');
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file. Please try another file.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });
  
  const categories = [...new Set(samples.map(sample => sample.category))];
  
  const filteredSamples = selectedCategory
    ? samples.filter(sample => sample.category === selectedCategory)
    : samples;
  
  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sample Statements</h1>
          <p className="text-muted-foreground">
            Manage sample NHS supporting statements for reference
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedCategory || "all"}
            onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category || "general"}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sample
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Sample Statement' : 'Add New Sample Statement'}</DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? 'Update this sample NHS supporting statement'
                    : 'Add a new sample NHS supporting statement for reference'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Statement Title</Label>
                  <Input
                    id="title"
                    placeholder="E.g., Clinical Nurse Specialist Statement"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinical">Clinical</SelectItem>
                      <SelectItem value="administrative">Administrative</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="content">Statement Content</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="text-xs h-8"
                      onClick={() => document.getElementById('file-upload-trigger')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      Import from File
                    </Button>
                  </div>
                  
                  <div 
                    {...getRootProps()} 
                    className="hidden"
                  >
                    <input {...getInputProps()} id="file-upload-trigger" />
                  </div>
                  
                  <Textarea
                    id="content"
                    placeholder="Enter the sample statement content..."
                    className="min-h-[300px]"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Update Sample' : 'Add Sample'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSamples.length > 0 ? (
            filteredSamples.map((sample) => (
              <Card key={sample.id} className="hover-lift">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <span className="line-clamp-1">{sample.title}</span>
                      </CardTitle>
                      <CardDescription>
                        Added: {new Date(sample.dateAdded).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                      {sample.category.charAt(0).toUpperCase() + sample.category.slice(1)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">
                    {sample.content}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePreview(sample)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(sample)}
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
                          This will permanently delete the sample statement "{sample.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-600"
                          onClick={() => handleDelete(sample.id)}
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
              <h3 className="text-xl font-semibold mb-2">No Sample Statements Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Add your first NHS supporting statement sample to help users understand effective statements.
              </p>
              <Button onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Sample
              </Button>
            </div>
          )}
        </div>
      )}
      
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className={isMobile ? "w-[95vw] max-w-full" : "max-w-3xl"}>
          <DialogHeader>
            <DialogTitle>{previewSample?.title || 'Sample Preview'}</DialogTitle>
            <DialogDescription>
              Category: {previewSample?.category ? (previewSample.category.charAt(0).toUpperCase() + previewSample.category.slice(1)) : ''} | 
              Added: {previewSample ? new Date(previewSample.dateAdded).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 whitespace-pre-wrap">
              {previewSample?.content || ''}
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

export default AdminSampleStatements;

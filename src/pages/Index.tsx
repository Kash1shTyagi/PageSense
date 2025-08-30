import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/FileUpload';
import { ProcessingStatus, FileProcessingStatus } from '@/components/ProcessingStatus';
import { ContentViewer } from '@/components/ContentViewer';
import { ServerStatus } from '@/components/ServerStatus';
import { useToast } from '@/hooks/use-toast';
import { api, APIError } from '@/services/api';
import { Play, Settings, FileText, Zap, Shield, Globe, AlertTriangle } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

const Index = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState<FileProcessingStatus[]>([]);
  const [outlines, setOutlines] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select PDF files to process.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Initialize processing status
    const initialStatuses: FileProcessingStatus[] = selectedFiles.map((file, index) => ({
      id: `file-${index}`,
      name: file.name,
      status: 'pending'
    }));
    setProcessingFiles(initialStatuses);

    // Process files sequentially
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      try {
        // Update to processing
        setProcessingFiles(prev => prev.map(f => 
          f.id === `file-${i}` ? { ...f, status: 'processing' as const } : f
        ));

        // Call real API
        const response = await api.extractOutline(file);

        const documentOutline = {
          title: response.title,
          outline: response.outline,
          fileName: file.name
        };

        // Complete processing
        setProcessingFiles(prev => prev.map(f => 
          f.id === `file-${i}` ? { 
            ...f, 
            status: 'completed' as const, 
            outline: response 
          } : f
        ));

        setOutlines(prev => [...prev, documentOutline]);

      } catch (error) {
        let errorMessage = 'Unknown error occurred';
        
        if (error instanceof APIError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Set error status
        setProcessingFiles(prev => prev.map(f => 
          f.id === `file-${i}` ? { 
            ...f, 
            status: 'error' as const, 
            error: errorMessage 
          } : f
        ));

        toast({
          title: "Processing failed",
          description: `Failed to process ${file.name}: ${errorMessage}`,
          variant: "destructive"
        });
      }
    }

    setIsProcessing(false);
    
    const successCount = processingFiles.filter(f => f.status === 'completed').length;
    if (successCount > 0) {
      toast({
        title: "Processing complete!",
        description: `Successfully processed ${successCount} of ${selectedFiles.length} files.`
      });
    }
  };

  const resetAll = () => {
    setSelectedFiles([]);
    setProcessingFiles([]);
    setOutlines([]);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
        <div className="container relative mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Powered Analysis
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  PDF Outline
                  <span className="text-primary block">Extractor</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  Automatically extract structured outlines from PDF documents using advanced font analysis and heading detection.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium">Secure Processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium">Batch Processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium">JSON Export</span>
                </div>
              </div>
            </div>
            
            <div className="lg:flex justify-center">
              <img 
                src={heroImage} 
                alt="PDF Analysis Tool"
                className="w-full max-w-md lg:max-w-lg rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-12 space-y-8">
        {/* Server Status */}
        <ServerStatus />

        {/* Upload Section */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Upload PDF Documents</span>
            </CardTitle>
            <CardDescription>
              Select multiple PDF files to extract structured outlines. Our system analyzes font sizes and styles to detect headings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload 
              onFilesSelected={setSelectedFiles}
              maxFiles={10}
              disabled={isProcessing}
            />
          </CardContent>
        </Card>

        {/* Processing Controls */}
        {selectedFiles.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={processFiles}
                    disabled={isProcessing}
                    className="bg-primary hover:bg-primary-hover"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Processing...' : 'Extract Outlines'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={resetAll}
                    disabled={isProcessing}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Reset All
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {selectedFiles.length} files selected
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Status */}
        <ProcessingStatus files={processingFiles} isProcessing={isProcessing} />

        {/* Results */}
        <ContentViewer outlines={outlines} />

        {/* Features Section */}
        {outlines.length === 0 && (
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <Card className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold mb-2">AI-Powered Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Advanced font analysis detects headings using size, style, and formatting patterns from your PDFs.
              </p>
            </Card>
            
            <Card className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-success" />
                </div>
              </div>
              <h3 className="font-semibold mb-2">Real-time Processing</h3>
              <p className="text-sm text-muted-foreground">
                Upload multiple PDF documents and watch real-time extraction progress with detailed status updates.
              </p>
            </Card>
            
            <Card className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
              </div>
              <h3 className="font-semibold mb-2">Structured Export</h3>
              <p className="text-sm text-muted-foreground">
                Export hierarchical outlines in JSON format with heading levels, text content, and page references.
              </p>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronRight, 
  ChevronDown, 
  Download, 
  FileText, 
  Hash, 
  Eye,
  Code,
  Copy,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface OutlineItem {
  level: string;
  text: string;
  page: number;
}

interface DocumentOutline {
  title: string;
  outline: OutlineItem[];
  fileName: string;
}

interface ContentViewerProps {
  outlines: DocumentOutline[];
}

export const ContentViewer = ({ outlines }: ContentViewerProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const downloadJson = (outline: DocumentOutline) => {
    const dataStr = JSON.stringify({ title: outline.title, outline: outline.outline }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${outline.fileName.replace('.pdf', '')}-outline.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const downloadAllJson = () => {
    const allOutlines = outlines.reduce((acc, outline) => {
      acc[outline.fileName] = { title: outline.title, outline: outline.outline };
      return acc;
    }, {} as Record<string, any>);
    
    const dataStr = JSON.stringify(allOutlines, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'all-outlines.json');
    linkElement.click();
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "JSON data has been copied to your clipboard."
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'H1':
        return 'bg-primary text-primary-foreground';
      case 'H2':
        return 'bg-secondary text-secondary-foreground';
      case 'H3':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getLevelIndent = (level: string) => {
    switch (level) {
      case 'H1':
        return 'ml-0';
      case 'H2':
        return 'ml-6';
      case 'H3':
        return 'ml-12';
      default:
        return 'ml-0';
    }
  };

  if (outlines.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Extracted Content & Outlines</h2>
        {outlines.length > 1 && (
          <Button onClick={downloadAllJson} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download All JSON
          </Button>
        )}
      </div>

      {outlines.map((documentOutline, index) => {
        const documentId = `doc-${index}`;
        const isExpanded = expandedItems.has(documentId);
        const jsonData = JSON.stringify({ title: documentOutline.title, outline: documentOutline.outline }, null, 2);
        
        return (
          <Card key={documentId} className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(documentId)}>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center space-x-3">
                      {isExpanded ? 
                        <ChevronDown className="h-5 w-5 text-muted-foreground" /> : 
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      }
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-left group-hover:text-primary transition-colors">
                          {documentOutline.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {documentOutline.fileName} • {documentOutline.outline.length} headings extracted
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadJson(documentOutline);
                        }}
                        variant="outline" 
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        JSON
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Tabs defaultValue="outline" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        Outline View
                      </TabsTrigger>
                      <TabsTrigger value="json">
                        <Code className="h-4 w-4 mr-2" />
                        JSON Data
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="outline" className="mt-4">
                      {documentOutline.outline.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No headings detected in this document</p>
                          <p className="text-sm mt-2">The document may not contain structured headings or may need different font analysis parameters.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {documentOutline.outline.map((item, itemIndex) => (
                            <div
                              key={itemIndex}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors",
                                getLevelIndent(item.level)
                              )}
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <Badge className={getLevelColor(item.level)} variant="secondary">
                                  {item.level}
                                </Badge>
                                <p className="font-medium text-foreground">{item.text}</p>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                <span>Page {item.page}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="json" className="mt-4">
                      <div className="relative">
                        <div className="absolute top-3 right-3 z-10">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(jsonData, documentId)}
                            className="h-8"
                          >
                            {copiedItem === documentId ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                          <code className="text-foreground">{jsonData}</code>
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
};
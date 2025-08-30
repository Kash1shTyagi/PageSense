import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileProcessingStatus {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
  outline?: {
    title: string;
    outline: Array<{
      level: string;
      text: string;
      page: number;
    }>;
  };
}

interface ProcessingStatusProps {
  files: FileProcessingStatus[];
  isProcessing: boolean;
}

export const ProcessingStatus = ({ files, isProcessing }: ProcessingStatusProps) => {
  const completedFiles = files.filter(f => f.status === 'completed').length;
  const totalFiles = files.length;
  const overallProgress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  const getStatusIcon = (status: FileProcessingStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing':
        return <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: FileProcessingStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-primary text-primary-foreground">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  if (files.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Processing Status</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedFiles} / {totalFiles} files
          </span>
        </CardTitle>
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={overallProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Overall progress: {Math.round(overallProgress)}%
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                file.status === 'completed' && "bg-success/5 border-success/20",
                file.status === 'error' && "bg-destructive/5 border-destructive/20",
                file.status === 'processing' && "bg-primary/5 border-primary/20"
              )}
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(file.status)}
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {file.name}
                  </p>
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                  {file.status === 'processing' && file.progress !== undefined && (
                    <div className="mt-1">
                      <Progress value={file.progress} className="h-1 w-32" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(file.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
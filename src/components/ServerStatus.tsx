import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';

export const ServerStatus = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      await api.healthCheck();
      setStatus('online');
    } catch (error) {
      setStatus('offline');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    switch (status) {
      case 'checking':
        return (
          <Badge variant="secondary" className="animate-pulse">
            <div className="h-2 w-2 rounded-full bg-muted-foreground mr-2" />
            Checking...
          </Badge>
        );
      case 'online':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Server Online
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Server Offline
          </Badge>
        );
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusBadge()}
            {status === 'offline' && (
              <p className="text-sm text-muted-foreground">
                Make sure the backend is running
              </p>
            )}
            {status === 'online' && (
              <p className="text-sm text-muted-foreground">
                Backend is running
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { servicesApi } from "@/services/api";
import { ServiceConnection } from "@/services/types";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Helper function to format the last synced time
const formatLastSynced = (dateString?: string): string => {
  if (!dateString) return "Never";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

export function ServiceStatus() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load services from API
  useEffect(() => {
    const fetchServices = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await servicesApi.getServices();
        setServices(response.services || []);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError("Failed to load services");
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, [currentUser]);

  // Handle syncing a service
  const handleSyncService = async (id: string) => {
    if (syncingId) return; // Prevent multiple syncs at once
    
    setSyncingId(id);
    
    try {
      await servicesApi.syncService(id);
      
      // Refresh the services list
      const response = await servicesApi.getServices();
      setServices(response.services || []);
      
      toast({
        title: "Success",
        description: "Service synchronized successfully",
      });
    } catch (err) {
      console.error("Error syncing service:", err);
      toast({
        title: "Error",
        description: "Failed to synchronize service",
        variant: "destructive"
      });
    } finally {
      setSyncingId(null);
    }
  };

  // Render the component
  const renderServiceContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {error}
        </div>
      );
    }
    
    if (services.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No services configured
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  service.isConnected ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                )}
              />
              <span className="font-medium">{service.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {service.isConnected ? (
                <>
                  <span className="text-xs text-muted-foreground mr-1">
                    Synced: {formatLastSynced(service.lastSynced)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    disabled={syncingId === service.id}
                    onClick={() => handleSyncService(service.id)}
                  >
                    <RefreshCw className={cn(
                      "h-3 w-3",
                      syncingId === service.id && "animate-spin"
                    )} />
                    <span className="sr-only">Sync</span>
                  </Button>
                  <div className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600">
                    Connected
                  </div>
                </>
              ) : (
                <div className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                  Not Connected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Connected Services</CardTitle>
      </CardHeader>
      <CardContent>
        {renderServiceContent()}
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '../components/ui/use-toast';
import { useAuth } from '../hooks/use-auth';

export default function AuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const provider = searchParams.get('provider');
  const error = searchParams.get('error');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  
  useEffect(() => {
    const processAuth = async () => {
      try {
        // Handle errors from OAuth flow
        if (error) {
          console.error('OAuth error:', error);
          toast({
            title: 'Authentication Error',
            description: `Error during ${provider || 'OAuth'} authentication: ${error}`,
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }
        
        // Ensure we have provider info and are logged in
        if (!provider || !currentUser) {
          // If no provider specified or not logged in, redirect to auth page
          if (!currentUser) {
            toast({
              title: 'Authentication Required',
              description: 'Please sign in to continue.',
              variant: 'destructive',
            });
          }
          navigate('/auth');
          return;
        }
        
        // At this point, the OAuth process was successful and user is logged in
        toast({
          title: 'Successfully Connected',
          description: `Your ${provider} account has been successfully connected.`,
        });
        
        // Redirect to home
        setTimeout(() => {
          navigate('/');
        }, 1500);
        
      } catch (err) {
        console.error('Error processing auth callback:', err);
        toast({
          title: 'Authentication Error',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
        navigate('/auth');
      } finally {
        setIsProcessing(false);
      }
    };
    
    processAuth();
  }, [provider, error, navigate, currentUser]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-muted/50 to-muted">
      <div className="w-full max-w-md p-6 bg-background rounded-lg shadow-lg space-y-4 text-center">
        <h1 className="text-2xl font-bold">
          {isProcessing ? 'Completing Authentication...' : 'Authentication Complete'}
        </h1>
        
        {isProcessing ? (
          <div className="flex justify-center my-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            You will be redirected automatically.
          </p>
        )}
      </div>
    </div>
  );
}

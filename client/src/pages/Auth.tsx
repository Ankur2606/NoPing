import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { LoginForm } from "../components/auth/LoginForm";
import { RegisterForm } from "../components/auth/RegisterForm";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { LucideGithub, LucideGoal } from "lucide-react";
import { Separator } from "../components/ui/separator";
import { signInWithGoogle } from "../lib/firebase";
import { toast } from "../components/ui/use-toast";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate("/");
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // First authenticate with Firebase
      const { user, error } = await signInWithGoogle();

      if (error) {
        console.error("Google sign in error:", error);
        toast({
          title: "Authentication Error",
          description: "Failed to sign in with Google. Please try again.",
          variant: "destructive"
        });
        setIsGoogleLoading(false);
        return;
      }

      if (user) {
        toast({
          title: "Successfully signed in",
          description: `Welcome ${user.displayName || user.email}!`
        });
        console.log("User signed in:", user);

        // Check if we need to proceed with additional OAuth for email access
        try {
          console.log("pappu", await user.getIdToken())
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/token/google`, {
            headers: {
              Authorization: `Bearer ${await user.getIdToken()}`,
              'cache-control': 'no-cache',
              'Content-Type': 'application/json'
            }
          });

          console.log("Response from token check:", response);
          const tokenData = await response.json();

          // If we don't have Gmail access, redirect to OAuth flow
          if (!response.ok || !tokenData.hasEmailAccess) {
            console.log("Need additional Gmail permissions, redirecting to OAuth flow...");

            // Get the OAuth URL from our backend
            const authUrlResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/google-auth-url`);
            const { authUrl } = await authUrlResponse.json();
            console.log("OAuth URL:", authUrl);
            // Redirect the user to Google's consent page
            window.location.href = authUrl;
            return;
          }

          // If we already have correct permissions, complete authentication
          handleAuthSuccess();
        } catch (apiError) {
          console.error("API error checking token status:", apiError);
          // Still allow login even if API check fails
          // handleAuthSuccess();
        }
      }
    } catch (err) {
      console.error("Unexpected error during Google sign in:", err);
      toast({
        title: "Authentication Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/50 to-muted p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to Flow</h1>
          <p className="text-muted-foreground">
            Sign in to your account or create a new one
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm onSuccess={handleAuthSuccess} />
          </TabsContent>
          <TabsContent value="register">
            <RegisterForm onSuccess={() => setActiveTab("login")} />
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
            ) : (
              <LucideGoal className="mr-2 h-4 w-4" />
            )}
            Google
          </Button>
          <Button variant="outline" className="w-full" disabled>
            <LucideGithub className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
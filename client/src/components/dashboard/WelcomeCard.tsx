import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export function WelcomeCard() {
  const { currentUser } = useAuth();
  
  // Get user's display name or extract name from email, or use "there" as fallback
  const userName = currentUser?.displayName || 
                  (currentUser?.email ? currentUser.email.split('@')[0] : "there");

  return (
    <Card className="overflow-hidden border-0 bg-purple-gradient text-white">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-2xl font-bold">Welcome back, {userName}!</h2>
          <p className="text-white/90">
            You have 8 critical messages and 3 tasks due today.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" className="font-medium">
              Check Inbox
            </Button>
            <Button variant="outline" className="border-white/30 bg-white/10 hover:bg-white/20 text-white font-medium">
              Setup Services
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

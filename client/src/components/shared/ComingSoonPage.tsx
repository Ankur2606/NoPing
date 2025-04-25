
import { ReactNode } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function ComingSoonPage({ title, description, icon }: ComingSoonPageProps) {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 animate-float">
          {icon || <Clock className="w-8 h-8 text-muted-foreground" />}
        </div>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
        <div className="flex gap-3">
          <Button
            variant="default"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </Layout>
  );
}

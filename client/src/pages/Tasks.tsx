
import { Check, CheckCircle } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

const Tasks = () => {
  return (
    <ComingSoonPage
      title="Tasks Coming Soon"
      description="The tasks management feature is currently in development. You'll soon be able to organize, prioritize, and track all your tasks from different sources in one place."
      icon={<CheckCircle className="w-8 h-8 text-muted-foreground" />}
    />
  );
};

export default Tasks;

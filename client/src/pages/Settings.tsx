
import { Settings as SettingsIcon } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

const Settings = () => {
  return (
    <ComingSoonPage
      title="Settings Coming Soon"
      description="The settings page is currently in development. You'll soon be able to configure your services, notification preferences, and work-life balance settings."
      icon={<SettingsIcon className="w-8 h-8 text-muted-foreground" />}
    />
  );
};

export default Settings;

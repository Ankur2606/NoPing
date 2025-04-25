import { Layout } from "@/components/layout/Layout";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PriorityMessages } from "@/components/dashboard/PriorityMessages";
import { TasksDueToday } from "@/components/dashboard/TasksDueToday";
import { ServiceStatus } from "@/components/dashboard/ServiceStatus";
import { AudioBriefingControl } from "@/components/dashboard/AudioBriefingControl";
import { Bell, Calendar, CheckCircle, Inbox } from "lucide-react";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <WelcomeCard />
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Unread Messages"
            value="12"
            icon={<Inbox />}
            trend={{ value: "6%", positive: false }}
          />
          <StatsCard
            title="Critical Messages"
            value="3"
            icon={<Bell />}
            trend={{ value: "10%", positive: false }}
          />
          <StatsCard
            title="Tasks Completed"
            value="8"
            icon={<CheckCircle />}
            trend={{ value: "12%", positive: true }}
          />
          <StatsCard
            title="Events Today"
            value="2"
            icon={<Calendar />}
          />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <PriorityMessages />
          <div className="flex flex-col gap-6">
            <AudioBriefingControl />
            <TasksDueToday />
            <ServiceStatus />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

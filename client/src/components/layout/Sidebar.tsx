import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Inbox, Calendar, Check, Settings, Home, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
}

const SidebarItem = ({ icon, label, href, isActive }: SidebarItemProps) => {
  return (
    <a 
      href={href}
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all hover:bg-flowsync-soft-purple dark:hover:bg-sidebar-accent",
        isActive ? "bg-flowsync-soft-purple dark:bg-sidebar-accent text-flowsync-purple dark:text-primary" : 
        "text-foreground/70 hover:text-foreground"
      )}
    >
      <div className="w-5 h-5">{icon}</div>
      <span className="font-medium">{label}</span>
    </a>
  );
};

export function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { currentUser } = useAuth();

  // Generate user initials from display name or email
  const getUserInitials = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    } else if (currentUser?.email) {
      return currentUser.email
        .split('@')[0]
        .substring(0, 2)
        .toUpperCase();
    }
    return "US"; // Fallback if no user info is available
  };

  // Get user's display name or extract name from email
  const userName = currentUser?.displayName || 
                  (currentUser?.email ? currentUser.email.split('@')[0] : "User");

  const userEmail = currentUser?.email || "No email";

  // Function to handle logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Redirect happens automatically through ProtectedRoute
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const sidebarItems = [
    {
      icon: <Home className="w-5 h-5" />,
      label: "Dashboard",
      href: "/",
    },
    {
      icon: <Inbox className="w-5 h-5" />,
      label: "Inbox",
      href: "/inbox",
    },
    {
      icon: <Check className="w-5 h-5" />,
      label: "Tasks",
      href: "/tasks",
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      label: "Calendar",
      href: "/calendar",
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: "Settings",
      href: "/settings",
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: "Subscriptions",
      href: "/subscription",
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r border-border bg-background p-4 lg:block hidden">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 py-2">
          <div className="h-8 w-8 rounded-lg bg-purple-gradient flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="font-bold text-xl">FlowSync</span>
        </div>
      </div>
      
      <nav className="flex flex-col gap-1">
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={
              item.href === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.href)
            }
          />
        ))}
      </nav>
      
      {/* User profile section */}
      <div className="absolute bottom-8 left-4 right-4 flex flex-col gap-4">
        <div className="rounded-lg bg-flowsync-soft-purple p-4 dark:bg-sidebar-accent">
          <h4 className="font-medium mb-2">Need help?</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Check out our guides and documentation
          </p>
          <Button variant="default" size="sm" className="w-full bg-flowsync-purple hover:bg-flowsync-purple-dark">
            View Guides
          </Button>
        </div>
{/* 
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-flowsync-purple text-primary-foreground">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 text-sm" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div> */}
      </div>
    </aside>
  );
}

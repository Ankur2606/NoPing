import { useState } from "react";
import { Bell, Menu, Search, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/authContext";
import { auth } from "@/lib/firebase";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState([
    { id: 1, text: "New critical email from boss", time: "5m ago", read: false },
    { id: 2, text: "Task deadline approaching", time: "1h ago", read: false },
    { id: 3, text: "Team meeting in 30 minutes", time: "25m ago", read: true },
  ]);

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

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-border bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="hidden md:flex md:w-1/3 lg:w-1/4 xl:w-1/5">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-muted pl-8 focus-visible:ring-flowsync-purple"
          />
        </div>
      </div>
      
      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-flowsync-orange text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-medium">Notifications</h3>
              <Button variant="ghost" size="sm" className="text-xs">
                Mark all as read
              </Button>
            </div>
            <div className="max-h-80 overflow-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="p-0">
                  <button 
                    className={`w-full p-4 text-left flex flex-col gap-1 border-t border-border ${notification.read ? '' : 'bg-muted/50'}`} 
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="font-medium">{notification.text}</div>
                    <div className="text-xs text-muted-foreground">{notification.time}</div>
                  </button>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0" size={null}>
              <Avatar>
                <AvatarFallback className="bg-flowsync-purple text-primary-foreground cursor-pointer">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2 text-center">
              <p className="font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a href="/settings" className="flex w-full items-center">
                <User className="mr-2 h-4 w-4" />Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a href="/settings" className="flex w-full items-center">
                <Settings className="mr-2 h-4 w-4" />Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

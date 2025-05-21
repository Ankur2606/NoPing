
import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className={cn(
        "fixed inset-0 z-20 bg-background/80 backdrop-blur-sm lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )} onClick={toggleSidebar} />
      
      <Sidebar />
      
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-auto px-4 py-2 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

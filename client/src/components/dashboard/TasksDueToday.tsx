import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tasksApi } from "@/services/api";
import { Task } from "@/services/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Helper function to format due date
const formatDueTime = (dateString: string) => {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  return `Today, ${formattedHours}:${formattedMinutes} ${ampm}`;
};

export function TasksDueToday() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tasks due today from API
  useEffect(() => {
    const fetchTasksDueToday = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await tasksApi.getTasksDueToday();
        setTasks(response.tasks || []);
      } catch (err) {
        console.error("Error fetching tasks due today:", err);
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasksDueToday();
  }, [currentUser]);

  // Handle toggling task completion status
  const handleToggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      await tasksApi.completeTask(id, !currentStatus);
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === id ? { ...task, completed: !currentStatus } : task
        )
      );
      
      toast({
        title: "Success",
        description: !currentStatus 
          ? "Task marked as completed" 
          : "Task marked as incomplete",
      });
    } catch (err) {
      console.error("Error updating task:", err);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks Due Today</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tasks due today
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-start space-x-4 rounded-lg border p-4",
                  task.completed && "opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2 cursor-pointer",
                    task.completed && "border-green-500 bg-green-500/20",
                    !task.completed && task.priority === "high" && "border-red-500",
                    !task.completed && task.priority === "medium" && "border-amber-500",
                    !task.completed && task.priority === "low" && "border-blue-500"
                  )}
                  onClick={() => handleToggleComplete(task.id, task.completed)}
                >
                  {task.completed && <Check className="h-3 w-3 text-green-500" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p
                    className={cn(
                      "font-medium",
                      task.completed && "line-through"
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Due: {task.dueDate ? formatDueTime(task.dueDate) : "Today"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

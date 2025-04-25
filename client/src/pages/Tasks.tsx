import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { tasksApi } from "@/services/api";
import { Task } from "@/services/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import {
  CalendarIcon,
  Check,
  CheckCheck,
  CheckCircle,
  Clock,
  Filter,
  ListFilter,
  Loader2,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Helper function to format dates
const formatDate = (dateString: string | null) => {
  if (!dateString) return "No due date";

  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (isTomorrow) {
    return `Tomorrow, ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

// Initial task form state
const initialTaskForm = {
  title: "",
  description: "",
  dueDate: "",
  priority: "medium",
  tags: "",
};

const Tasks = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTasks, setTotalTasks] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");

  // New task form state
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load tasks from API
  const fetchTasks = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params: {
        completed?: boolean | string;
        priority?: string;
        dueDate?: string;
        limit?: number;
        offset?: number;
      } = {
        limit: 100  // Fetch a large number of tasks initially
      };
      
      // Apply filters from activeTab
      if (activeTab === "completed") {
        params.completed = true;
      } else if (activeTab === "active") {
        params.completed = false;
      }
      
      // Additional filters
      if (priorityFilter !== "all") {
        params.priority = priorityFilter;
      }
      
      if (dueDateFilter !== "all") {
        params.dueDate = dueDateFilter;
      }
      
      const response = await tasksApi.getTasks(params);
      
      setTasks(response.tasks || []);
      setTotalTasks(response.total || 0);
      
      // Check for task ID in URL search params and select that task
      const taskId = searchParams.get('taskId');
      if (taskId) {
        const selectedTask = response.tasks.find(task => task.id === taskId);
        if (selectedTask) {
          setSelectedTask(selectedTask);
        }
      }
      
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks");
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, activeTab, priorityFilter, dueDateFilter, searchParams, toast]);

  // Initial load
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Filter tasks based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTasks(tasks);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = tasks.filter(
        task =>
          task.title.toLowerCase().includes(term) ||
          (task.description && task.description.toLowerCase().includes(term)) ||
          (task.tags && task.tags.some(tag => tag.toLowerCase().includes(term)))
      );
      setFilteredTasks(filtered);
    }
  }, [tasks, searchTerm]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedTask(null);
    
    // Update search params to remove taskId when switching tabs
    if (searchParams.has('taskId')) {
      searchParams.delete('taskId');
      setSearchParams(searchParams);
    }
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    
    // Update URL to include selected task ID
    searchParams.set('taskId', task.id);
    setSearchParams(searchParams);
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      await tasksApi.completeTask(task.id, !task.completed);
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id ? { ...t, completed: !task.completed } : t
        )
      );
      
      // Also update selectedTask if this is the selected task
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask({ ...selectedTask, completed: !task.completed });
      }
      
      toast({
        title: "Success",
        description: task.completed 
          ? "Task marked as incomplete" 
          : "Task marked as complete"
      });
    } catch (err) {
      console.error("Error updating task completion status:", err);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksApi.deleteTask(taskId);
      
      // Update local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // Clear selected task if it was deleted
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
        
        // Update URL to remove taskId
        if (searchParams.has('taskId')) {
          searchParams.delete('taskId');
          setSearchParams(searchParams);
        }
      }
      
      toast({
        title: "Success",
        description: "Task deleted successfully"
      });
    } catch (err) {
      console.error("Error deleting task:", err);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  };
  
  const handleRefresh = () => {
    fetchTasks();
  };
  
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskForm.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format the new task data
      const newTask = {
        title: taskForm.title,
        description: taskForm.description,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
        priority: taskForm.priority as 'high' | 'medium' | 'low',
        tags: taskForm.tags.split(',').map(tag => tag.trim()).filter(tag => !!tag),
        completed: false,
      };
      
      const createdTask = await tasksApi.createTask(newTask);
      
      // Add the new task to the list
      setTasks(prevTasks => [createdTask, ...prevTasks]);
      
      // Reset form and close dialog
      setTaskForm(initialTaskForm);
      setIsNewTaskDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Task created successfully"
      });
    } catch (err) {
      console.error("Error creating task:", err);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show loading state while initializing
  if (isLoading && tasks.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </Layout>
    );
  }
  
  // Show error state if there was an error
  if (error && tasks.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Failed to load tasks</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Tasks</h1>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search tasks..." 
                className="pl-8 w-full sm:w-[200px] lg:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                Refresh
              </Button>
              
              <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleCreateTask}>
                    <DialogHeader>
                      <DialogTitle>Create New Task</DialogTitle>
                      <DialogDescription>
                        Add a new task to your list. Click save when you're done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="task-title" className="text-right">
                          Title
                        </Label>
                        <Input
                          id="task-title"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                          placeholder="Enter task title"
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="task-description" className="text-right align-top mt-2">
                          Description
                        </Label>
                        <Textarea
                          id="task-description"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                          placeholder="Task details (optional)"
                          className="col-span-3"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="task-duedate" className="text-right">
                          Due Date
                        </Label>
                        <Input
                          id="task-duedate"
                          type="datetime-local"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="task-priority" className="text-right">
                          Priority
                        </Label>
                        <Select 
                          value={taskForm.priority} 
                          onValueChange={(value) => setTaskForm({...taskForm, priority: value})}
                        >
                          <SelectTrigger id="task-priority" className="col-span-3">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="task-tags" className="text-right">
                          Tags
                        </Label>
                        <Input
                          id="task-tags"
                          value={taskForm.tags}
                          onChange={(e) => setTaskForm({...taskForm, tags: e.target.value})}
                          placeholder="work, personal, etc. (comma separated)"
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={() => setIsNewTaskDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Task'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={handleTabChange}
          >
            <TabsList>
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ListFilter className="h-4 w-4 mr-1" />
                  Priority: {priorityFilter === 'all' ? 'All' : priorityFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPriorityFilter('all')}>
                  All Priorities
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter('high')}>
                  High Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter('medium')}>
                  Medium Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter('low')}>
                  Low Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Due: {dueDateFilter === 'all' ? 'All' : dueDateFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Due Date</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDueDateFilter('all')}>
                  All Dates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDueDateFilter('today')}>
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDueDateFilter('tomorrow')}>
                  Tomorrow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDueDateFilter('week')}>
                  Next 7 Days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="col-span-1 md:h-[calc(100vh-220px)] overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex justify-between items-center">
                Task List
                <span className="text-xs bg-muted px-2 py-1 rounded-md">
                  {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-auto max-h-[calc(100vh-280px)]">
              {isLoading && filteredTasks.length > 0 ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTasks.length > 0 ? (
                <div className="divide-y">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedTask?.id === task.id && "bg-muted",
                        task.completed && "opacity-70"
                      )}
                      onClick={() => handleSelectTask(task)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2",
                            task.completed && "border-green-500 bg-green-500/20",
                            !task.completed && task.priority === "high" && "border-red-500",
                            !task.completed && task.priority === "medium" && "border-amber-500",
                            !task.completed && task.priority === "low" && "border-blue-500"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleComplete(task);
                          }}
                        >
                          {task.completed && <Check className="h-3 w-3 text-green-500" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-medium truncate",
                            task.completed && "line-through"
                          )}>
                            {task.title}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No matching tasks found" : "No tasks available"}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="col-span-2 md:h-[calc(100vh-220px)] overflow-hidden">
            {selectedTask ? (
              <>
                <CardHeader className="py-4 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {selectedTask.title}
                        {selectedTask.completed && (
                          <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                            Completed
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created: {formatDate(selectedTask.createdOn)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleComplete(selectedTask)}
                      >
                        {selectedTask.completed ? (
                          <>
                            <CheckCheck className="h-4 w-4 mr-1" />
                            Mark Incomplete
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Mark Complete
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteTask(selectedTask.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 overflow-auto max-h-[calc(100vh-330px)]">
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
                      <div className="flex items-center">
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full mr-2",
                          selectedTask.priority === "high" && "bg-red-500",
                          selectedTask.priority === "medium" && "bg-amber-500",
                          selectedTask.priority === "low" && "bg-blue-500"
                        )} />
                        <span className="capitalize">{selectedTask.priority}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
                      <p>{formatDate(selectedTask.dueDate)}</p>
                    </div>
                    
                    {selectedTask.tags && selectedTask.tags.length > 0 && (
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                        <div className="flex flex-wrap gap-1">
                          {selectedTask.tags.map((tag, index) => (
                            <div
                              key={index}
                              className="bg-muted text-xs px-2 py-1 rounded-md flex items-center gap-1"
                            >
                              <Tag className="h-3 w-3" />
                              {tag}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedTask.source && (
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-muted-foreground">Source</h3>
                        <p className="capitalize">{selectedTask.source}</p>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {selectedTask.description ? (
                          <p>{selectedTask.description}</p>
                        ) : (
                          <p className="text-muted-foreground italic">No description provided</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <CheckCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">Select a task</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a task from the list to view its details
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Tasks;


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  due: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

const tasks: Task[] = [
  {
    id: "1",
    title: "Finish Q3 budget report",
    due: "Today, 2:00 PM",
    priority: "high",
    completed: false,
  },
  {
    id: "2",
    title: "Review website design changes",
    due: "Today, 5:00 PM",
    priority: "medium",
    completed: false,
  },
  {
    id: "3",
    title: "Update team meeting agenda",
    due: "Today, 6:00 PM",
    priority: "low",
    completed: true,
  },
];

export function TasksDueToday() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks Due Today</CardTitle>
      </CardHeader>
      <CardContent>
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
                  "flex h-5 w-5 items-center justify-center rounded-full border-2",
                  task.completed && "border-green-500 bg-green-500/20",
                  !task.completed &&
                    task.priority === "high" &&
                    "border-red-500",
                  !task.completed &&
                    task.priority === "medium" &&
                    "border-amber-500",
                  !task.completed &&
                    task.priority === "low" &&
                    "border-blue-500"
                )}
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
                  Due: {task.due}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

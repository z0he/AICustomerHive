import { FC } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Task {
  id: number;
  title: string;
  dueDate: string;
  completed: boolean;
}

interface NextActionsProps {
  tasks: Task[];
  onToggleTask: (id: number) => void;
  onAddTask: () => void;
}

const NextActions: FC<NextActionsProps> = ({ tasks, onToggleTask, onAddTask }) => {
  return (
    <Card>
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle>Upcoming Tasks</CardTitle>
        <button 
          onClick={onAddTask}
          className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center"
        >
          <Plus className="mr-1" size={16} />
          <span>Add Task</span>
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center">
              <Checkbox 
                id={`task-${task.id}`} 
                checked={task.completed} 
                onCheckedChange={() => onToggleTask(task.id)}
                className="h-4 w-4 text-primary-600 rounded mr-3" 
              />
              <div>
                <p className={`text-sm font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {task.title}
                </p>
                <p className="text-xs text-slate-500">{task.dueDate}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NextActions;

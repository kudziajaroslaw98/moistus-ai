import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import generateUuid from "@/helpers/generate-uuid";
import { NodeData } from "@/types/node-data";
import { Trash2 } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

interface Task {
  id: string;
  text: string;
  isComplete: boolean;
}

interface TaskNodeFormProps {
  initialData: NodeData;
}

const TaskNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  TaskNodeFormProps
>(({ initialData }, ref) => {
  const [tasks, setTasks] = useState<Task[]>(initialData.metadata?.tasks || []);

  useEffect(() => {
    setTasks(initialData.metadata?.tasks || []);
  }, [initialData.metadata?.tasks]);

  useImperativeHandle(ref, () => ({
    getFormData: () => {
      // Filter out empty tasks before saving
      const validTasks = tasks.filter((task) => task.text.trim() !== "");
      return {
        // Content might represent a title or overall description now, or be unused
        // content: content.trim(),
        metadata: {
          ...(initialData.metadata || {}),
          tasks: validTasks.length > 0 ? validTasks : undefined, // Save undefined if no valid tasks
        },
      };
    },
  }));

  const handleAddTask = () => {
    setTasks([...tasks, { id: generateUuid(), text: "", isComplete: false }]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleTaskTextChange = (id: string, text: string) => {
    setTasks(
      tasks.map((task) => (task.id === id ? { ...task, text: text } : task)),
    );
  };

  const handleTaskCompleteChange = (id: string, isComplete: boolean) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, isComplete: isComplete } : task,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Label className="text-sm font-medium text-zinc-400">Tasks</Label>

      {tasks.length === 0 && (
        <p className="text-sm text-zinc-500 italic">No tasks added yet.</p>
      )}

      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-2">
        {tasks.map((task, index) => (
          <div key={task.id} className="flex items-center gap-2">
            <FormField
              label={`Task ${index + 1} Complete`}
              id={`taskComplete-${task.id}`}
              className="sr-only" // Hide label visually, but keep for accessibility
            >
              <Input
                type="checkbox"
                id={`taskComplete-${task.id}`}
                checked={task.isComplete}
                onChange={(e) =>
                  handleTaskCompleteChange(task.id, e.target.checked)
                }
                className="h-4 w-4 flex-shrink-0 rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700"
              />
            </FormField>

            <Input
              type="text"
              value={task.text}
              onChange={(e) => handleTaskTextChange(task.id, e.target.value)}
              placeholder={`Task ${index + 1} description...`}
              className="flex-grow"
              aria-label={`Task ${index + 1} description`}
            />

            <Button
              variant="ghost-destructive"
              size="icon"
              onClick={() => handleDeleteTask(task.id)}
              aria-label={`Delete task ${index + 1}`}
              className="flex-shrink-0"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={handleAddTask} className="mt-2">
        Add Task
      </Button>
    </div>
  );
});

TaskNodeForm.displayName = "TaskNodeForm";

export default TaskNodeForm;

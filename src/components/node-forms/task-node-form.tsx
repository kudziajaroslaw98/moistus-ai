import { NodeData } from "@/types/node-data";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

interface TaskNodeFormProps {
  initialData: NodeData;
}

const TaskNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  TaskNodeFormProps
>(({ initialData }, ref) => {
  const [content, setContent] = useState(initialData?.content || "");
  const [isComplete, setIsComplete] = useState(
    Boolean(initialData.metadata?.isComplete),
  );

  useEffect(() => {
    setContent(initialData?.content || "");
    setIsComplete(Boolean(initialData.metadata?.isComplete));
  }, [initialData?.content, initialData.metadata?.isComplete]);

  useImperativeHandle(ref, () => ({
    getFormData: () => {
      return {
        content: content.trim(),
        metadata: {
          ...(initialData.metadata || {}),
          isComplete: isComplete,
        },
      };
    },
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FormField label="Task Complete" id="taskComplete">
          <Input
            type="checkbox"
            id="taskComplete"
            checked={isComplete}
            onChange={(e) => setIsComplete(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700"
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-2">
        <FormField label="Task Description" id="taskContent">
          <Textarea
            id="taskContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            placeholder="Enter task description here..."
          />
        </FormField>
      </div>
    </div>
  );
});

TaskNodeForm.displayName = "TaskNodeForm";

export default TaskNodeForm;

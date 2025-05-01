import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { NodeData } from "@/types/node-data";

interface TaskNodeFormProps {
  initialData: NodeData;
}

const TaskNodeForm = forwardRef<{ getFormData: () => Partial<NodeData> | null }, TaskNodeFormProps>(
  ({ initialData }, ref) => {
    const [content, setContent] = useState(initialData?.content || "");
    const [isComplete, setIsComplete] = useState(Boolean(initialData.metadata?.isComplete));

    // Sync local state if initialData changes
    useEffect(() => {
      setContent(initialData?.content || "");
      setIsComplete(Boolean(initialData.metadata?.isComplete));
    }, [initialData?.content, initialData.metadata?.isComplete]);

    useImperativeHandle(ref, () => ({
      getFormData: () => {
        return {
          content: content.trim(),
          metadata: {
            ...(initialData.metadata || {}), // Keep existing metadata
            isComplete: isComplete,
          },
        };
      },
    }));

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="taskComplete"
            checked={isComplete}
            onChange={(e) => setIsComplete(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700"
          />
          <label htmlFor="taskComplete" className="text-sm font-medium text-zinc-400">Task Complete</label>
        </div>
        <div className="flex flex-col gap-2">
            <label htmlFor="taskContent" className="text-sm font-medium text-zinc-400">Task Description</label>
            <textarea
              id="taskContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter task description here..."
            />
        </div>
      </div>
    );
  }
);

TaskNodeForm.displayName = 'TaskNodeForm';

export default TaskNodeForm;

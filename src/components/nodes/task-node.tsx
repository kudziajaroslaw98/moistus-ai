"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Node, NodeProps } from "@xyflow/react";
import { CheckSquare, Square, SquareCheck } from "lucide-react"; // Import Square icon
import { memo, useCallback, useMemo } from "react"; // Import useMemo
import { BaseNodeWrapper } from "./base-node-wrapper";

interface Task {
  id: string;
  text: string;
  isComplete: boolean;
}

interface TaskNodeProps extends NodeProps<Node<NodeData>> {}

const TaskNodeComponent = (props: TaskNodeProps) => {
  const { id, data, saveNodeProperties } = props;
  const tasks: Task[] = useMemo(
    () => data.metadata?.tasks || [],
    [data.metadata?.tasks],
  );

  // Calculate overall completion status
  // const allTasksComplete = useMemo(
  //   () => tasks.length > 0 && tasks.every((task) => task.isComplete),
  //   [tasks],
  // );

  const handleToggleTask = useCallback(
    async (taskId: string) => {
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, isComplete: !task.isComplete } : task,
      );

      try {
        await saveNodeProperties(id, {
          metadata: { ...data.metadata, tasks: updatedTasks },
        });
      } catch (error) {
        console.error("Failed to save task status:", error);
      }
    },
    [tasks, saveNodeProperties, id, data.metadata],
  );

  return (
    <BaseNodeWrapper
      {...props}
      nodeClassName="task-node"
      nodeType="Tasks"
      nodeIcon={<SquareCheck className="size-4" />}
    >
      <div className="flex flex-col gap-1.5">
        {tasks.length === 0 ? (
          <span className="text-zinc-500 italic">
            Double click or click the menu to add tasks...
          </span>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-sm">
              <button
                onClick={() => handleToggleTask(task.id)}
                className="nodrag flex-shrink-0 cursor-pointer rounded p-0.5 text-zinc-400 hover:text-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:ring-offset-1 focus:ring-offset-zinc-950"
                aria-label={
                  task.isComplete
                    ? "Mark task incomplete"
                    : "Mark task complete"
                }
              >
                {task.isComplete ? (
                  <CheckSquare className="size-4 text-teal-400" />
                ) : (
                  <Square className="size-4" />
                )}
              </button>

              <span
                className={cn([
                  "break-words",
                  task.isComplete
                    ? "text-zinc-500 line-through"
                    : "text-zinc-300",
                ])}
              >
                {task.text || (
                  <span className="italic text-zinc-600">Empty task</span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </BaseNodeWrapper>
  );
};

const TaskNode = memo(TaskNodeComponent);
TaskNode.displayName = "TaskNode";
export default TaskNode;

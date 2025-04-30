import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, Position, useReactFlow } from "@xyflow/react";
import { Ellipsis, HelpCircle } from "lucide-react"; // Import Question icon
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { saveNodeContent } from "@/helpers/save-node-content";

export default function QuestionNode(props: Node<NodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(props.data?.content || "");
  const reactFlowInstance = useReactFlow();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const handleDoubleClick = useCallback(() => {
    if (!isEditing) {
      // Only enter editing if not already editing
      setIsEditing(true);
    }
  }, [isEditing]);

  const handleBlur = async () => {
    setIsEditing(false);
    // Trim content before comparing and saving
    const trimmedContent = localContent.trim();
    const trimmedOriginalContent = props.data?.content?.trim() || "";

    // Only save if content has actually changed
    if (trimmedContent !== trimmedOriginalContent) {
      // Update React Flow state immediately with the new content
      reactFlowInstance.setNodes((nds) =>
        nds.map((node) =>
          node.id === props.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  content: trimmedContent,
                  label: trimmedContent, // Update label for mini-map/overview
                },
              }
            : node,
        ),
      );
      // Save to database in the background
      await saveNodeContent(props.id, trimmedContent);
      // History is managed by the hook receiving node changes or save events
    }
  };

  return (
    <div
      className={cn([
        isEditing && "nodrag",
        "relative w-80 h-auto p-2 flex flex-col gap-2 bg-zinc-950 border-2 border-zinc-900 rounded-lg transition-all",
        props.selected && "border-sky-700",
      ])}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
    >
      <div className="w-full relative h-14 p-2 flex justify-between bg-zinc-900 rounded-md">
        <div className="flex gap-4 justify-center items-center z-20">
          <div className="size-10 rounded-sm bg-red-100 flex justify-center items-center">
            <HelpCircle className="size-8 text-zinc-950" />
          </div>

          <div className="font-semibold text-zinc-400 z-10">Question</div>
        </div>

        <div className="flex gap-4 justify-center items-center z-20">
          <div className="flex gap-2 justify-center items-center">
            <button
              className="text-sm text-zinc-400 hover:text-zinc-200 p-1 rounded-sm bg-zinc-500/20"
              onClick={() => {
                // Handle edit action
                console.log("Edit clicked");
              }}
            >
              <Ellipsis className="size-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      <motion.div className="text-sm pb-4 pt-2">
        {isEditing ? (
          <motion.textarea
            ref={editorRef}
            value={localContent}
            initial={{ maxHeight: 0 }}
            animate={{ maxHeight: 1000 }}
            exit={{ maxHeight: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-20 p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onChange={(e) => setLocalContent(e.target.value)}
            rows={3} // Ensure enough rows are visible by default
            onBlur={handleBlur}
          />
        ) : (
          <>{props.data.content}</>
        )}
      </motion.div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="size-2 rounded-full !bg-zinc-200 !border-zinc-300 border-4 outline-2 outline-zinc-800"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="size-2 rounded-full !bg-zinc-200 !border-zinc-300 border-4 outline-2 outline-zinc-800"
      />
      <Handle
        type="target"
        position={Position.Right}
        className="size-2 rounded-full !bg-zinc-200 !border-zinc-300 border-4 outline-2 outline-zinc-800"
      />
    </div>
  );
}

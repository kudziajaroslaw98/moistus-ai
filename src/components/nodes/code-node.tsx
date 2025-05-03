"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { Code, Copy, Ellipsis } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { useNotifications } from "@/hooks/use-notifications";
import { memo, useCallback, useState } from "react";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const CodeNodeComponent = (props: CodeNodeProps) => {
  const { id, data, selected, onEditNode } = props;
  const { showNotification } = useNotifications();

  const codeContent = data.content || "";
  const language = (data.metadata?.language as string) || "javascript";
  const showLineNumbers = Boolean(data.metadata?.showLineNumbers ?? true);

  const [copied, setCopied] = useState(false);

  const handleEllipsisClick = useCallback(() => {
    onEditNode(id, data);
  }, [id, data, onEditNode]);

  const handleDoubleClick = useCallback(() => {
    onEditNode(id, data);
  }, [id, data, onEditNode]);

  const handleCopy = useCallback(async () => {
    if (!codeContent) return;

    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      showNotification("Code copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
      showNotification("Failed to copy code.", "error");
    }
  }, [codeContent, showNotification]);

  return (
    <div
      className={cn([
        "relative flex min-h-20 min-w-80 max-w-[600px] flex-col gap-0 rounded-lg border-2 border-zinc-900 bg-zinc-950 p-0 transition-all",
        selected && "border-sky-700",
      ])}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header */}
      <div className="relative flex h-10 flex-shrink-0 items-center justify-between rounded-t-md bg-zinc-900 p-2">
        <div className="z-20 flex items-center justify-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-sm bg-gray-600">
            <Code className="size-4 text-zinc-100" />
          </div>

          <span className="text-xs font-medium uppercase text-zinc-400">
            {language}
          </span>
        </div>

        <div className="z-20 flex items-center justify-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!codeContent}
            className="rounded-sm p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
            title="Copy code"
          >
            <Copy className={`size-4 ${copied ? "text-emerald-400" : ""}`} />
          </button>

          <button
            className="rounded-sm p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            onClick={handleEllipsisClick}
          >
            <Ellipsis className="size-4" />
          </button>
        </div>
      </div>

      {/* Code Block */}
      <div className="nodrag nowheel code-block-container w-full flex-grow overflow-auto pointer-events-none">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          customStyle={{
            margin: 0,
            padding: "1rem",
            borderRadius: "0 0 0.5rem 0.5rem",
            fontSize: "0.8rem",
            backgroundColor: "#1E1E1E",
          }}
          codeTagProps={{
            style: {
              fontFamily: "var(--font-geist-mono)",
              lineHeight: "1.4",
            },
          }}
        >
          {codeContent || "// Add code snippet here..."}
        </SyntaxHighlighter>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!top-0 size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />

      <Handle
        type="target"
        position={Position.Right}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />

      <Handle
        type="target"
        position={Position.Left}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />

      <NodeResizer
        color="#0069a8"
        isVisible={selected}
        minWidth={200}
        minHeight={80}
      />
    </div>
  );
};

const CodeNode = memo(CodeNodeComponent);
CodeNode.displayName = "CodeNode";
export default CodeNode;

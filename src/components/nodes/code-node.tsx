"use client";

import { NodeData } from "@/types/node-data";
import { Node, NodeProps } from "@xyflow/react";
import { Code, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { useNotifications } from "@/hooks/use-notifications";
import { memo, useCallback, useState } from "react";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { BaseNodeWrapper } from "./base-node-wrapper";

interface CodeNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const CodeNodeComponent = (props: CodeNodeProps) => {
  const { data } = props;
  const { showNotification } = useNotifications();

  const codeContent = data.content || "";
  const language = (data.metadata?.language as string) || "javascript";
  const showLineNumbers = Boolean(data.metadata?.showLineNumbers ?? true);

  const [copied, setCopied] = useState(false);

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

  const header = (
    <>
      <div className="flex size-6 items-center justify-center rounded-sm bg-gray-600">
        <Code className="size-4 text-zinc-100" />
      </div>

      <span className="text-xs font-medium uppercase text-zinc-400">
        {language}
      </span>
    </>
  );

  const actions = (
    <>
      <button
        onClick={handleCopy}
        disabled={!codeContent}
        className="rounded-sm p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
        title="Copy code"
      >
        <Copy className={`size-4 ${copied ? "text-emerald-400" : ""}`} />
      </button>
    </>
  );

  return (
    <BaseNodeWrapper {...props} headerContent={header} headerActions={actions}>
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
    </BaseNodeWrapper>
  );
};

const CodeNode = memo(CodeNodeComponent);
CodeNode.displayName = "CodeNode";
export default CodeNode;

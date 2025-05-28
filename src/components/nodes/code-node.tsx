"use client";

import { NodeData } from "@/types/node-data";
import { Node, NodeProps } from "@xyflow/react";
import { ClipboardCopy, Code, SquareCode } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { memo, useCallback, useState } from "react";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { BaseNodeWrapper } from "./base-node-wrapper";

type CodeNodeProps = NodeProps<Node<NodeData>>;

const CodeNodeComponent = (props: CodeNodeProps) => {
  const { id, data } = props;

  const codeContent = data.content || "";
  const language = (data.metadata?.language as string) || "javascript";
  const showLineNumbers = Boolean(data.metadata?.showLineNumbers ?? true);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!codeContent) return;

    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
      toast.error("Failed to copy code");
    }
  }, [codeContent]);

  return (
    <BaseNodeWrapper
      {...props}
      nodeClassName="code-node"
      nodeType="Code"
      nodeIcon={<Code className="size-4" />}
      includePadding={false}
    >
      <div className="w-full flex-grow overflow-auto ">
        <div className="flex justify-between p-4">
          <div className=" flex flex-col w-full">
            <div className="flex gap-4 items-center">
              <SquareCode className="size-6 text-node-text-main" />

              <span className="capitalize text-lg text-node-text-main">
                {data.metadata?.language}
              </span>
            </div>

            {data.metadata?.fileName && (
              <span className="ml-10 text-node-text-secondary">
                {data.metadata?.fileName}
              </span>
            )}
          </div>

          <div className="flex ">
            <Button
              onClick={handleCopy}
              size={"icon"}
              variant={"ghost"}
              className="!cursor-pointer"
              disabled={copied}
            >
              <ClipboardCopy className="size-4 text-node-accent" />
            </Button>
          </div>
        </div>

        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          wrapLongLines={true}
          customStyle={{
            width: "100%",
            margin: 0,
            padding: "1rem",
            borderRadius: "0 0 0.5rem 0.5rem",
            fontSize: "0.8rem",
            backgroundColor: "",
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

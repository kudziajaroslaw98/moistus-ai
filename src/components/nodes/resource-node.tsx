import { NodeData } from "@/types/node-data";
import BaseEditableNode from "./base-editable-node";
import { NodeProps, Handle, Position } from "@xyflow/react";
import { Link } from "lucide-react"; // Import Link icon

export default function ResourceNode(props: NodeProps<NodeData>) {
  const { data } = props;
  const url = data.metadata?.url as string | undefined;

  return (
    // Wrap BaseEditableNode to add the link icon alongside the content area
    <div className="relative flex items-center gap-2 rounded-sm shadow-md border border-zinc-600 bg-zinc-700 p-3">
      {" "}
      {/* Combined styling with flex */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800"
      />
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="nodrag flex-shrink-0 text-sky-400 hover:text-sky-300" // Tailwind link style
          title={url}
          onClick={(e) => e.stopPropagation()} // Prevent React Flow drag
        >
          <Link className="h-5 w-5" /> {/* Icon size slightly larger */}
        </a>
      )}
      {/* BaseEditableNode renders the text content */}
      {/* Pass only relevant props and hide handles as we add them manually here */}
      <div className="flex-grow">
        {" "}
        {/* Ensure base node takes remaining space */}
        <BaseEditableNode
          {...props}
          id={props.id}
          data={props.data}
          selected={props.selected}
          hideHandles={true}
        />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800"
      />
    </div>
  );
}

import { Handle, Position, Node } from "@xyflow/react";
import BaseEditableNode from "./base-editable-node";
import { NodeData } from "@/types/node-data";

export default function ImageNode(props: Node<NodeData>) {
  const { data } = props;
  const imageUrl = data.metadata?.image_url as string | undefined;

  return (
    // The BaseEditableNode now controls the main background/border.
    // We wrap it and add image-specific elements.
    <div className="rounded-sm overflow-hidden shadow-md">
      {" "}
      {/* Apply rounded corners and shadow to the wrapper */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800"
      />
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={data.content || "Node Image"}
          className="mb-2 block max-h-[150px] max-w-full w-full object-contain rounded-sm" // Added nodrag, rounded, max-width/height
        />
      ) : (
        <div
          className="mb-2 flex h-[50px] w-full items-center justify-center rounded-sm bg-zinc-600 text-xs text-zinc-400" // Tailwind placeholder
        >
          No Image
        </div>
      )}
      {/* BaseEditableNode renders the text content and main node box */}
      {/* Pass only relevant props + hideHandles */}
      <BaseEditableNode
        {...props}
        id={props.id}
        data={props.data}
        selected={props.selected}
        hideHandles={true}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800"
      />
    </div>
  );
}

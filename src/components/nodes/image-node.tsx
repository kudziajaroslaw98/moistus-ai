"use client";

import { NodeData } from "@/types/node-data";
import { Node, NodeProps } from "@xyflow/react";
import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import { BaseNodeWrapper } from "./base-node-wrapper";

interface ImageNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const ImageNodeComponent = (props: ImageNodeProps) => {
  const { data } = props;
  const header = (
    <div className="flex size-6 items-center justify-center rounded-sm bg-purple-700">
      <ImageIcon className="size-4 text-zinc-100" />
    </div>
  );

  const imageUrl = data.metadata?.image_url as string | undefined;
  const showCaption = Boolean(data.metadata?.showCaption);

  return (
    <BaseNodeWrapper {...props} headerContent={header} nodeClassName="min-h-50">
      {imageUrl ? (
        <div className="relative flex w-full h-full rounded-md bg-zinc-800">
          <Image
            src={imageUrl}
            alt={data.content || "Node Image"}
            className="nodrag pointer-events-none block h-full w-full min-h-32 object-cover"
            onClick={(e) => e.stopPropagation()}
            loading="lazy"
            fill={true}
          />
        </div>
      ) : (
        <div className="flex h-[50px] w-full items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-400">
          No Image URL
        </div>
      )}

      {/* Content Area (for caption/description) - now display only */}
      {/* {showCaption && (
        <div className="min-h-[3rem] pt-2 pb-4 text-sm whitespace-pre-wrap text-zinc-300">
          {data.content || (
            <span className="text-zinc-500 italic">
              No caption added. Double click or click the menu to add one...
            </span>
          )}
        </div>
      )} */}
    </BaseNodeWrapper>
  );
};

const ImageNode = memo(ImageNodeComponent);
ImageNode.displayName = "ImageNode";
export default ImageNode;

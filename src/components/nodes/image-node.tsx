"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
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

  const imageUrl = data.metadata?.image_url as string | undefined;
  const showCaption = Boolean(data.metadata?.showCaption);

  return (
    <BaseNodeWrapper
      {...props}
      nodeClassName={cn(["image-node h-full gap-0"])}
      nodeType="Image"
      nodeIcon={<ImageIcon className="size-4" />}
      includePadding={false}
    >
      <>
        {imageUrl ? (
          <div className="relative flex w-full h-full min-h-32 rounded-md">
            <Image
              src={imageUrl}
              alt={data.content || "Node Image"}
              className={cn([
                "nodrag pointer-events-none h-full w-full min-h-32 object-cover",
                showCaption ? "rounded-t-md" : "rounded-md",
              ])}
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/200x120?text=Image+Error";
              }}
              loading="lazy"
              fill={true}
            />
          </div>
        ) : (
          <div className="flex h-[50px] w-full items-center justify-center rounded-md bg-zinc-800 text-xs text-node-text-secondary">
            No Image URL
          </div>
        )}

        {/* Content Area (for caption/description) - now display only */}
        {showCaption && (
          <div className="p-4 text-sm whitespace-pre-wrap text-node-text-secondary">
            {data.content || (
              <span className="text-zinc-500 italic">
                No caption added. Double click or click the menu to add one...
              </span>
            )}
          </div>
        )}
      </>
    </BaseNodeWrapper>
  );
};

const ImageNode = memo(ImageNodeComponent);
ImageNode.displayName = "ImageNode";
export default ImageNode;

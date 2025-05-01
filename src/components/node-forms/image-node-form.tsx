import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { NodeData } from "@/types/node-data";

interface ImageNodeFormProps {
  initialData: NodeData;
}

const ImageNodeForm = forwardRef<{ getFormData: () => Partial<NodeData> | null }, ImageNodeFormProps>(
  ({ initialData }, ref) => {
    const [content, setContent] = useState(initialData?.content || "");
    const [imageUrl, setImageUrl] = useState(initialData.metadata?.image_url as string || "");
    // Add state for other potential metadata fields like showCaption
    const [showCaption, setShowCaption] = useState(Boolean(initialData.metadata?.showCaption));


    // Sync local state if initialData changes
    useEffect(() => {
      setContent(initialData?.content || "");
      setImageUrl(initialData.metadata?.image_url as string || "");
      setShowCaption(Boolean(initialData.metadata?.showCaption));
    }, [initialData?.content, initialData.metadata?.image_url, initialData.metadata?.showCaption]);

    useImperativeHandle(ref, () => ({
      getFormData: () => {
        return {
          content: content.trim(),
          metadata: {
            ...(initialData.metadata || {}), // Keep existing metadata
            image_url: imageUrl.trim(),
            showCaption: showCaption,
          },
        };
      },
    }));

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
            <label htmlFor="imageUrl" className="text-sm font-medium text-zinc-400">Image URL</label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter image URL here..."
            />
        </div>
         <div className="flex flex-col gap-2">
            <label htmlFor="imageCaption" className="text-sm font-medium text-zinc-400">Image Caption/Description</label>
            <textarea
              id="imageCaption"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4} // Slightly fewer rows for caption
              className="w-full p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter caption or description here..."
            />
        </div>
        <div className="flex items-center gap-2">
            <input
                type="checkbox"
                id="showCaption"
                checked={showCaption}
                onChange={(e) => setShowCaption(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700"
            />
            <label htmlFor="showCaption" className="text-sm font-medium text-zinc-400">Show Caption</label>
        </div>
      </div>
    );
  }
);

ImageNodeForm.displayName = 'ImageNodeForm';

export default ImageNodeForm;

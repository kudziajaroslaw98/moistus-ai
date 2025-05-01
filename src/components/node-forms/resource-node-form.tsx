import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { NodeData } from "@/types/node-data";
import useFetch from "@/hooks/use-fetch";
import { Loader2 } from "lucide-react"; // For loading spinner

interface ResourceNodeFormProps {
  initialData: NodeData;
}

// Define the metadata structure
interface UrlMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  summary: string | null;
}

const ResourceNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  ResourceNodeFormProps
>(({ initialData }, ref) => {
  const [content, setContent] = useState(initialData?.content || "");
  const [url, setUrl] = useState((initialData.metadata?.url as string) || "");
  const [showThumbnail, setShowThumbnail] = useState(
    Boolean(initialData.metadata?.showThumbnail),
  );
  const [showSummary, setShowSummary] = useState(
    Boolean(initialData.metadata?.showSummary),
  );
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [imageUrl, setImageUrl] = useState(
    (initialData.metadata?.imageUrl as string) || "",
  );
  const [summary, setSummary] = useState(
    (initialData.metadata?.summary as string) || "",
  );
  const [title, setTitle] = useState(
    (initialData.metadata?.title as string) || "",
  );
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { fetch } = useFetch();

  // Sync local state if initialData changes
  useEffect(() => {
    setContent(initialData?.content || "");
    setUrl((initialData.metadata?.url as string) || "");
    setShowThumbnail(Boolean(initialData.metadata?.showThumbnail));
    setShowSummary(Boolean(initialData.metadata?.showSummary));
    setImageUrl((initialData.metadata?.imageUrl as string) || "");
    setSummary((initialData.metadata?.summary as string) || "");
    setTitle((initialData.metadata?.title as string) || "");
  }, [
    initialData?.content,
    initialData.metadata?.url,
    initialData.metadata?.showThumbnail,
    initialData.metadata?.showSummary,
    initialData.metadata?.imageUrl,
    initialData.metadata?.summary,
    initialData.metadata?.title,
  ]);

  // Function to fetch URL metadata
  const fetchUrlMetadata = async () => {
    if (!url || !url.trim()) {
      setFetchError("Please enter a valid URL");
      return;
    }

    setIsProcessingUrl(true);
    setFetchError(null);

    try {
      const response = await fetch<UrlMetadata>("/api/process-url", {
        method: "POST",
        body: JSON.stringify({
          url: url.trim(),
          generateSummary: true,
        }),
      });

      if (response.status === "success" && response.data) {
        // Update form fields with the fetched data
        if (response.data.title) {
          setTitle(response.data.title);
          if (!content) setContent(response.data.title); // Use title as content if none exists
        }

        if (response.data.imageUrl) {
          setImageUrl(response.data.imageUrl);
          setShowThumbnail(true); // Auto-enable thumbnail if we got one
        }

        if (response.data.summary) {
          setSummary(response.data.summary);
          setShowSummary(true); // Auto-enable summary if we got one
        }
      } else {
        setFetchError(response.error || "Failed to process URL");
      }
    } catch (error) {
      console.error("Error fetching URL metadata:", error);
      setFetchError("An error occurred while processing the URL");
    } finally {
      setIsProcessingUrl(false);
    }
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => {
      return {
        content: content.trim(),
        metadata: {
          ...(initialData.metadata || {}), // Keep existing metadata
          url: url.trim(),
          imageUrl: imageUrl,
          summary: summary,
          title: title,
          showThumbnail: showThumbnail,
          showSummary: showSummary,
        },
      };
    },
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* URL Input Group with Fetch button */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="resourceUrl"
          className="text-sm font-medium text-zinc-400"
        >
          Resource URL
        </label>
        <div className="flex gap-2">
          <input
            id="resourceUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-grow w-full p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Enter resource URL here..."
            disabled={isProcessingUrl}
          />
          <button
            type="button"
            onClick={fetchUrlMetadata}
            disabled={isProcessingUrl || !url.trim()}
            className="px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 flex items-center"
          >
            {isProcessingUrl ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Fetching...
              </>
            ) : (
              "Fetch Data"
            )}
          </button>
        </div>
        {fetchError && (
          <p className="text-xs text-rose-400 mt-1">{fetchError}</p>
        )}
      </div>

      {/* Title Input (populated from OG data) */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="resourceTitle"
          className="text-sm font-medium text-zinc-400"
        >
          Title
        </label>
        <input
          id="resourceTitle"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Resource title..."
        />
      </div>

      {/* Description/Notes Input */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="resourceContent"
          className="text-sm font-medium text-zinc-400"
        >
          Description/Notes
        </label>
        <textarea
          id="resourceContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Enter description or notes here..."
        />
      </div>

      {/* Thumbnail URL */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="thumbnailUrl"
          className="text-sm font-medium text-zinc-400"
        >
          Thumbnail URL
        </label>
        <input
          id="thumbnailUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Image URL for thumbnail..."
        />
        {imageUrl && (
          <div className="mt-1">
            <img
              src={imageUrl}
              alt="Thumbnail preview"
              className="h-20 object-cover rounded-md"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/200x120?text=Invalid+Image";
              }}
            />
          </div>
        )}
      </div>

      {/* Summary Field */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="resourceSummary"
          className="text-sm font-medium text-zinc-400"
        >
          Summary (AI-generated)
        </label>
        <textarea
          id="resourceSummary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          className="w-full p-2 bg-zinc-800 text-zinc-200 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="AI-generated or custom summary..."
        />
      </div>

      {/* Display Options */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showThumbnail"
            checked={showThumbnail}
            onChange={(e) => setShowThumbnail(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700"
          />
          <label
            htmlFor="showThumbnail"
            className="text-sm font-medium text-zinc-400"
          >
            Show Thumbnail
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showSummary"
            checked={showSummary}
            onChange={(e) => setShowSummary(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700"
          />
          <label
            htmlFor="showSummary"
            className="text-sm font-medium text-zinc-400"
          >
            Show Summary
          </label>
        </div>
      </div>
    </div>
  );
});

ResourceNodeForm.displayName = "ResourceNodeForm";

export default ResourceNodeForm;

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { NodeData } from "@/types/node-data";

// Define the props expected by this form component
interface DefaultNodeFormProps {
  initialData: NodeData;
}

// Define the interface for the ref exposed by this component
interface DefaultNodeFormRef {
  getFormData: () => Partial<NodeData> | null;
}

// Use forwardRef to allow the parent modal to access getFormData
const DefaultNodeForm = forwardRef<DefaultNodeFormRef, DefaultNodeFormProps>(
  ({ initialData }, ref) => {
    // --- Local State for General Node Properties ---
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [status, setStatus] = useState<string | undefined>(undefined);
    const [importance, setImportance] = useState<number | undefined>(undefined);
    const [sourceUrl, setSourceUrl] = useState("");

    // Sync local state with initialData when it changes or on mount
    useEffect(() => {
      setContent(initialData?.content || "");
      setTags(initialData?.tags || []);
      setStatus(initialData?.status);
      setImportance(initialData?.importance as number | undefined);
      setSourceUrl(initialData?.sourceUrl || "");
    }, [initialData]); // Depend on the entire initialData object

    // Expose getFormData via useImperativeHandle
    useImperativeHandle(ref, () => ({
      getFormData: () => {
        // Return the current state of the fields managed by this form
        const formData: Partial<NodeData> = {
          content: content.trim() === "" ? null : content.trim(), // Save empty as null
          tags: tags.length > 0 ? tags : undefined, // Save empty array as undefined
          status: status || undefined, // Ensure undefined if empty/default
          importance: importance ?? undefined, // Handle 0 correctly, save undefined if null/NaN
          sourceUrl: sourceUrl.trim() === "" ? undefined : sourceUrl.trim(), // Save empty as undefined
          // Note: This form doesn't manage metadata directly for the 'defaultNode' type
          // If default nodes *could* have metadata, you'd handle it here.
          // metadata: {} // Or merge with existing metadata if applicable
        };
        return formData;
      },
    }));

    return (
      <div className="flex flex-col gap-6">
        {" "}
        {/* Outer container */}
        {/* General Content Field */}
        <div>
          <label
            htmlFor="defaultNodeContent"
            className="block text-sm font-medium text-zinc-400"
          >
            Content
          </label>
          <textarea
            id="defaultNodeContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 block min-h-[150px] w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
            placeholder="Enter node content..."
          />
        </div>
        {/* General Node Properties Section */}
        <div>
          <h3 className="text-md mb-2 font-semibold text-zinc-200">
            Properties
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tags Input */}
            <div>
              <label
                htmlFor="defaultNodeTags"
                className="block text-sm font-medium text-zinc-400"
              >
                Tags (comma-separated)
              </label>
              <input
                id="defaultNodeTags"
                type="text"
                value={tags.join(", ")}
                onChange={(e) =>
                  setTags(
                    e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter((tag) => tag.length > 0),
                  )
                }
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                placeholder="e.g. idea, research"
              />
            </div>
            {/* Status Select */}
            <div>
              <label
                htmlFor="defaultNodeStatus"
                className="block text-sm font-medium text-zinc-400"
              >
                Status
              </label>
              <select
                id="defaultNodeStatus"
                value={status || ""} // Use empty string for default/unselected
                onChange={(e) =>
                  setStatus(e.target.value === "" ? undefined : e.target.value)
                }
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
              >
                <option value="">-- Select Status --</option>
                <option value="draft">Draft</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
            {/* Importance Input */}
            <div>
              <label
                htmlFor="defaultNodeImportance"
                className="block text-sm font-medium text-zinc-400"
              >
                Importance (1-5)
              </label>
              <input
                id="defaultNodeImportance"
                type="number"
                value={importance ?? ""} // Handle undefined/null for placeholder
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setImportance(isNaN(value) ? undefined : value);
                }}
                min="1"
                max="5"
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                placeholder="e.g. 3"
              />
            </div>
            {/* Source URL Input */}
            <div>
              <label
                htmlFor="defaultNodeSourceUrl"
                className="block text-sm font-medium text-zinc-400"
              >
                Source URL
              </label>
              <input
                id="defaultNodeSourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                placeholder="http://example.com"
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

DefaultNodeForm.displayName = "DefaultNodeForm"; // Add display name for DevTools

export default DefaultNodeForm;

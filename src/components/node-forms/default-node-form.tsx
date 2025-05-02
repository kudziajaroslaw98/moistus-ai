import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { NodeData } from "@/types/node-data";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";

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
        };
        return formData;
      },
    }));

    return (
      <div className="flex flex-col gap-6">
        {/* General Content Field */}
        <FormField id="defaultNodeContent" label="Content">
          <Textarea
            id="defaultNodeContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter node content..."
            className="min-h-[150px]"
          />
        </FormField>

        {/* General Node Properties Section */}
        <div>
          <h3 className="text-md mb-2 font-semibold text-zinc-200">
            Properties
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tags Input */}
            <FormField id="defaultNodeTags" label="Tags (comma-separated)">
              <Input
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
                placeholder="e.g. idea, research"
              />
            </FormField>

            {/* Status Select */}
            <FormField id="defaultNodeStatus" label="Status">
              <Select
                id="defaultNodeStatus"
                value={status || ""} // Use empty string for default/unselected
                onChange={(e) =>
                  setStatus(e.target.value === "" ? undefined : e.target.value)
                }
              >
                <option value="">-- Select Status --</option>
                <option value="draft">Draft</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </Select>
            </FormField>

            {/* Importance Input */}
            <FormField id="defaultNodeImportance" label="Importance (1-5)">
              <Input
                id="defaultNodeImportance"
                type="number"
                value={importance ?? ""} // Handle undefined/null for placeholder
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setImportance(isNaN(value) ? undefined : value);
                }}
                min="1"
                max="5"
                placeholder="e.g. 3"
              />
            </FormField>

            {/* Source URL Input */}
            <FormField id="defaultNodeSourceUrl" label="Source URL">
              <Input
                id="defaultNodeSourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="http://example.com"
              />
            </FormField>
          </div>
        </div>
      </div>
    );
  },
);

DefaultNodeForm.displayName = "DefaultNodeForm"; // Add display name for DevTools

export default DefaultNodeForm;

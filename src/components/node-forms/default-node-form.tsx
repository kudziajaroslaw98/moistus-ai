import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NodeData } from "@/types/node-data";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

interface DefaultNodeFormProps {
  initialData: Partial<NodeData>;
}

interface DefaultNodeFormRef {
  getFormData: () => Partial<NodeData> | null;
}

const DefaultNodeForm = forwardRef<DefaultNodeFormRef, DefaultNodeFormProps>(
  ({ initialData }, ref) => {
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [status, setStatus] = useState<string | undefined | null>(undefined);
    const [importance, setImportance] = useState<number | undefined>(undefined);
    const [sourceUrl, setSourceUrl] = useState("");

    useEffect(() => {
      setContent(initialData?.content || "");
      setTags(initialData?.tags || []);
      setStatus(initialData?.status);
      setImportance(initialData?.importance as number | undefined);
      setSourceUrl(initialData?.sourceUrl || "");
    }, [initialData]);

    useImperativeHandle(ref, () => ({
      getFormData: () => {
        const formData: Partial<NodeData> = {
          content: content.trim() === "" ? null : content.trim(),
          tags: tags.length > 0 ? tags : undefined,
          status: status || undefined,
          importance: importance ?? undefined,
          sourceUrl: sourceUrl.trim() === "" ? undefined : sourceUrl.trim(),
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
                value={status || ""}
                onValueChange={(value) => setStatus(value)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>

                  <SelectItem value="in-progress">In Progress</SelectItem>

                  <SelectItem value="completed">Completed</SelectItem>

                  <SelectItem value="on-hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Importance Input */}
            <FormField id="defaultNodeImportance" label="Importance (1-5)">
              <Input
                id="defaultNodeImportance"
                type="number"
                value={Number.isFinite(importance) ? importance : ""}
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

DefaultNodeForm.displayName = "DefaultNodeForm";

export default DefaultNodeForm;

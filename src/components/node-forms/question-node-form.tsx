import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { NodeData } from "@/types/node-data";

interface QuestionNodeFormProps {
  initialData: NodeData;
}

// Use forwardRef to allow the parent modal to access methods on this component
const QuestionNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  QuestionNodeFormProps
>(({ initialData }, ref) => {
  const [content, setContent] = useState(initialData?.content || "");

  // Sync local state if initialData changes (e.g., modal re-opened for a different node)
  useEffect(() => {
    setContent(initialData?.content || "");
  }, [initialData?.content]);

  // Expose a method to get the current form data
  useImperativeHandle(ref, () => ({
    getFormData: () => {
      // Return only the fields that can be edited by this form
      return {
        content: content.trim(),
        // No metadata fields edited here
      };
    },
  }));

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="questionContent"
        className="text-sm font-medium text-zinc-400"
      >
        Question Content
      </label>
      <textarea
        id="questionContent"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
        placeholder="Enter your question here..."
      />
    </div>
  );
});

QuestionNodeForm.displayName = "QuestionNodeForm"; // Add display name for debugging

export default QuestionNodeForm;

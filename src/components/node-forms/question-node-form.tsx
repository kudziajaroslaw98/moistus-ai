import { NodeData } from "@/types/node-data";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

interface QuestionNodeFormProps {
  initialData: Partial<NodeData>;
}

const QuestionNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  QuestionNodeFormProps
>(({ initialData }, ref) => {
  const [content, setContent] = useState(initialData?.content || "");

  useEffect(() => {
    setContent(initialData?.content || "");
  }, [initialData?.content]);

  useImperativeHandle(ref, () => ({
    getFormData: () => {
      return {
        content: content.trim(),
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

QuestionNodeForm.displayName = "QuestionNodeForm";

export default QuestionNodeForm;

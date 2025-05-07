import { NodeData } from "@/types/node-data";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

interface AnnotationNodeFormProps {
  initialData: Partial<NodeData>;
}

const annotationTypes = ["comment", "idea", "quote", "summary"];
type AnnotationTypes = "comment" | "idea" | "quote" | "summary";

const AnnotationNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  AnnotationNodeFormProps
>(({ initialData }, ref) => {
  const [content, setContent] = useState(initialData?.content || "");

  const [fontSize, setFontSize] = useState<number | string>(
    (initialData.metadata?.fontSize as number | string) || "",
  );
  const [fontWeight, setFontWeight] = useState<string | number>(
    (initialData.metadata?.fontWeight as string | number) || "",
  );

  const [annotationType, setAnnotationType] = useState<AnnotationTypes>(
    initialData.metadata?.annotationType || "comment",
  );

  useEffect(() => {
    setContent(initialData?.content || "");
    setFontSize((initialData.metadata?.fontSize as number | string) || "");
    setFontWeight((initialData.metadata?.fontWeight as string | number) || "");
    setAnnotationType(initialData.metadata?.annotationType || "comment");
  }, [initialData]);

  useImperativeHandle(ref, () => ({
    getFormData: () => {
      return {
        content: content.trim(),
        metadata: {
          ...(initialData.metadata || {}),
          fontSize: fontSize || undefined,
          fontWeight: fontWeight || undefined,
          annotationType: annotationType || "comment",
        },
      };
    },
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="annotationContent"
          className="text-sm font-medium text-zinc-400"
        >
          Annotation Content
        </label>

        <textarea
          id="annotationContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 focus:ring-2 focus:ring-teal-500 focus:outline-none sm:text-sm"
          placeholder="Enter your annotation here..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Annotation Type Select */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="annotationType"
            className="block text-sm font-medium text-zinc-400"
          >
            Type
          </label>

          <select
            id="annotationType"
            value={annotationType}
            onChange={(e) =>
              setAnnotationType(e.target.value as AnnotationTypes)
            }
            className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
          >
            {annotationTypes.map((type) => (
              <option key={type} value={type} className="capitalize">
                {type.charAt(0).toUpperCase() + type.slice(1)}{" "}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size Input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="fontSize"
            className="text-sm font-medium text-zinc-400"
          >
            Font Size (px)
          </label>

          <input
            id="fontSize"
            type="number"
            value={fontSize === "" ? "" : Number(fontSize)}
            onChange={(e) => {
              const value = e.target.value;
              setFontSize(value === "" ? "" : Number(value));
            }}
            min="8"
            max="48"
            className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 focus:ring-2 focus:ring-teal-500 focus:outline-none sm:text-sm"
            placeholder="e.g. 14"
          />
        </div>

        {/* Font Weight Select */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="fontWeight"
            className="block text-sm font-medium text-zinc-400"
          >
            Font Weight
          </label>

          <select
            id="fontWeight"
            value={fontWeight || ""}
            onChange={(e) => setFontWeight(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
          >
            <option value="">Default</option>

            <option value="normal">Normal</option>

            <option value="bold">Bold</option>

            <option value="lighter">Lighter</option>

            <option value="bolder">Bolder</option>

            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => (
              <option key={weight} value={weight}>
                {weight}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});

AnnotationNodeForm.displayName = "AnnotationNodeForm";

export default AnnotationNodeForm;

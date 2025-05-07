import { NodeData } from "@/types/node-data";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

interface TextNodeFormProps {
  initialData: Partial<NodeData>;
}

const textAlignOptions: ("left" | "center" | "right")[] = [
  "left",
  "center",
  "right",
];

const TextNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  TextNodeFormProps
>(({ initialData }, ref) => {
  const [content, setContent] = useState(initialData?.content || "");
  const [fontSize, setFontSize] = useState<number | string>(
    initialData.metadata?.fontSize || "",
  );
  const [fontWeight, setFontWeight] = useState<string | number>(
    initialData.metadata?.fontWeight || "",
  );
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    initialData.metadata?.textAlign || "left",
  );
  const [showBackground, setShowBackground] = useState(
    Boolean(initialData.metadata?.showBackground ?? false),
  );
  const [backgroundColor, setBackgroundColor] = useState(
    initialData.metadata?.backgroundColor || "#3f3f46", // Default to a zinc-like color
  );
  const [textColor, setTextColor] = useState(
    initialData.metadata?.textColor || "#fafafa", // Default to a light text color
  );

  useEffect(() => {
    setContent(initialData?.content || "");
    setFontSize(initialData.metadata?.fontSize || "");
    setFontWeight(initialData.metadata?.fontWeight || "");
    setTextAlign(initialData.metadata?.textAlign || "left");
    setShowBackground(Boolean(initialData.metadata?.showBackground ?? false));
    setBackgroundColor(initialData.metadata?.backgroundColor || "#3f3f46");
    setTextColor(initialData.metadata?.textColor || "#fafafa");
  }, [initialData]);

  useImperativeHandle(ref, () => ({
    getFormData: () => {
      return {
        content: content.trim(),
        metadata: {
          ...(initialData.metadata || {}),
          fontSize: fontSize || undefined,
          fontWeight: fontWeight || undefined,
          textAlign: textAlign,
          showBackground: showBackground,
          backgroundColor: showBackground ? backgroundColor : undefined,
          textColor: textColor,
        },
      };
    },
  }));

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Text Content" id="textContent">
        <Textarea
          id="textContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Enter your text here..."
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Font Size (px or %)" id="fontSize">
          <Input
            id="fontSize"
            type="text" // Allow for units like '12px' or '1.2em' or just numbers
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            placeholder="e.g., 16 or 1em"
          />
        </FormField>

        <FormField label="Font Weight" id="fontWeight">
          <Select
            id="fontWeight"
            value={String(fontWeight)}
            onChange={(e) => setFontWeight(e.target.value)}
          >
            <option value="">Default</option>

            <option value="normal">Normal</option>

            <option value="bold">Bold</option>

            <option value="lighter">Lighter</option>

            <option value="bolder">Bolder</option>

            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Text Align" id="textAlign">
        <Select
          id="textAlign"
          value={textAlign}
          onChange={(e) =>
            setTextAlign(e.target.value as "left" | "center" | "right")
          }
        >
          {textAlignOptions.map((align) => (
            <option key={align} value={align} className="capitalize">
              {align}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Text Color" id="textColor">
          <Input
            id="textColor"
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
          />
        </FormField>
        <div /> {/* Placeholder for grid alignment */}
      </div>

      <div className="flex items-center space-x-2">
        <FormField label="Show Background" id="showBackground">
          <Switch
            id="showBackground"
            checked={showBackground}
            onChange={(e) => setShowBackground(e.target.checked)}
          />
        </FormField>
      </div>

      {showBackground && (
        <FormField label="Background Color" id="backgroundColor">
          <Input
            id="backgroundColor"
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
          />
        </FormField>
      )}
    </div>
  );
});

TextNodeForm.displayName = "TextNodeForm";
export default TextNodeForm;

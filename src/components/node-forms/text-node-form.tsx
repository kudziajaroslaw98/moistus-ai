import { NodeData } from "@/types/node-data";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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

const fontSizes = [
  { value: "8px", label: "8 px" },
  { value: "9px", label: "9 px" },
  { value: "11px", label: "11 px" },
  { value: "12px", label: "12 px" },
  { value: "13px", label: "13 px" },
  { value: "15px", label: "15 px" },
  { value: "16px", label: "16 px" },
  { value: "19px", label: "19 px" },
  { value: "21px", label: "21 px" },
  { value: "24px", label: "24 px" },
  { value: "27px", label: "27 px" },
  { value: "29px", label: "29 px" },
  { value: "32px", label: "32 px" },
  { value: "35px", label: "35 px" },
  { value: "37px", label: "37 px" },
  { value: "48px", label: "48 px" },
  { value: "64px", label: "64 px" },
  { value: "80px", label: "80 px" },
  { value: "96px", label: "96 px" },
];

const TextNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  TextNodeFormProps
>(({ initialData }, ref) => {
  const [content, setContent] = useState(initialData?.content || "");
  const [fontSize, setFontSize] = useState<string>(
    initialData.metadata?.fontSize || "16px",
  );
  const [fontWeight, setFontWeight] = useState<number>(
    initialData.metadata?.fontWeight || 400,
  );
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    initialData.metadata?.textAlign || "center",
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
    setFontSize(initialData.metadata?.fontSize || "16px");
    setFontWeight(initialData.metadata?.fontWeight || 400);
    setTextAlign(initialData.metadata?.textAlign || "center");
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
          <Select
            value={fontSize}
            onValueChange={(value) => setFontSize(value)} // Example: how to update state
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 w-full">
              <SelectValue placeholder="Select font size" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Font Sizes</SelectLabel>

                {fontSizes.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Font Weight" id="fontWeight">
          <Select
            value={fontWeight.toString()}
            onValueChange={(value) => setFontWeight(parseInt(value))}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 w-full">
              <SelectValue placeholder="Select Font Weight" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="100">Lighter</SelectItem>

              <SelectItem value="300">Light</SelectItem>

              <SelectItem value="400">Normal</SelectItem>

              <SelectItem value="500">Medium</SelectItem>

              <SelectItem value="600">Semibold</SelectItem>

              <SelectItem value="700">Bold</SelectItem>

              <SelectItem value="800">Bolder</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Text Align" id="textAlign">
        <Select
          value={textAlign}
          onValueChange={(value) =>
            setTextAlign(value as "left" | "center" | "right")
          }
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 w-full">
            <SelectValue placeholder="Select Font Weight" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>Text Align</SelectLabel>

              {textAlignOptions.map((align) => (
                <SelectItem key={align} value={align} className="capitalize">
                  {align}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
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

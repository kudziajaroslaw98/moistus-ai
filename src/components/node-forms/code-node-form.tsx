import { NodeData } from "@/types/node-data";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";

import { commonLanguages } from "@/constants/common-languages";

interface CodeNodeFormProps {
  initialData: Partial<NodeData>;
}

const CodeNodeForm = forwardRef<
  { getFormData: () => Partial<NodeData> | null },
  CodeNodeFormProps
>(({ initialData }, ref) => {
  const [content, setContent] = useState(initialData?.content || "");
  const [language, setLanguage] = useState(
    (initialData.metadata?.language as string) || "javascript",
  );
  const [showLineNumbers, setShowLineNumbers] = useState(
    Boolean(initialData.metadata?.showLineNumbers ?? true),
  );
  const [fileName, setFileName] = useState(
    (initialData.metadata?.fileName as string) || "",
  );

  useEffect(() => {
    setContent(initialData?.content || "");
    setLanguage((initialData.metadata?.language as string) || "javascript");
    setShowLineNumbers(Boolean(initialData.metadata?.showLineNumbers ?? true));
    setFileName((initialData.metadata?.fileName as string) || "");
  }, [initialData]);

  useImperativeHandle(ref, () => ({
    getFormData: () => {
      return {
        content: content,
        metadata: {
          ...(initialData.metadata || {}),
          language: language,
          showLineNumbers: showLineNumbers,
          fileName: fileName.trim() || undefined,
        },
      };
    },
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Code Input Area */}
      <FormField label="Code Snippet" id="codeContent">
        <Textarea
          id="codeContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 font-mono text-sm text-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Paste or type your code here..."
          spellCheck="false"
        />
      </FormField>

      {/* Settings Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Language" id="codeLanguage">
          <Select
            id="codeLanguage"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {commonLanguages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="File Name (Optional)" id="codeFileName">
          <Input
            id="codeFileName"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="e.g., script.js"
          />
        </FormField>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="checkbox"
          id="showLineNumbers"
          checked={showLineNumbers}
          onChange={(e) => setShowLineNumbers(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700"
        />

        <Label
          htmlFor="showLineNumbers"
          className="text-sm font-medium text-zinc-400"
        >
          Show Line Numbers
        </Label>
      </div>
    </div>
  );
});

CodeNodeForm.displayName = "CodeNodeForm";
export default CodeNodeForm;

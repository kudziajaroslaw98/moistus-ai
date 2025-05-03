import { NodeData } from "@/types/node-data";
import { NodeEditModalProps } from "@/types/node-edit-modal-props";
import React, {
  ComponentType,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import { SidePanel } from "../side-panel";
import { Button } from "../ui/button";

interface SpecificNodeFormProps {
  initialData: NodeData;
}

interface SpecificNodeFormRef {
  getFormData: () => Partial<NodeData> | null;
}

const formComponentMap: Record<
  string,
  ComponentType<
    React.PropsWithRef<
      SpecificNodeFormProps & { ref: React.ForwardedRef<SpecificNodeFormRef> }
    >
  >
> = {
  defaultNode: lazy(() => import("../node-forms/default-node-form")),
  taskNode: lazy(() => import("../node-forms/task-node-form")),
  imageNode: lazy(() => import("../node-forms/image-node-form")),
  questionNode: lazy(() => import("../node-forms/question-node-form")),
  resourceNode: lazy(() => import("../node-forms/resource-node-form")),
  annotationNode: lazy(() => import("../node-forms/annotation-node-form")),
  codeNode: lazy(() => import("../node-forms/code-node-form")),
};

export default function NodeEditModal({
  isOpen,
  onClose,
  clearData,
  node,
  onSave,
  isLoading,
}: NodeEditModalProps) {
  const formRef = useRef<SpecificNodeFormRef>(null);

  const [aiSummary, setAiSummary] = useState<string | undefined>(undefined);
  const [extractedConcepts, setExtractedConcepts] = useState<
    string[] | undefined
  >(undefined);

  useEffect(() => {
    if (node) {
      setAiSummary(node.data?.aiSummary);
      setExtractedConcepts(node.data?.extractedConcepts);
    } else {
      setAiSummary(undefined);
      setExtractedConcepts(undefined);
    }

    if (!isOpen) {
      setAiSummary(undefined);
      setExtractedConcepts(undefined);
    }
  }, [node, isOpen]);

  const handleSave = async () => {
    if (!node || isLoading || !formRef.current) return;

    const specificFormData = formRef.current.getFormData();

    if (!specificFormData) {
      console.error("Could not get form data from the specific node form.");
      return;
    }

    const changes: Partial<NodeData> = {
      ...specificFormData,
    };

    await onSave(node.id, changes);
  };

  if (!node) return null;

  const SpecificFormComponent =
    formComponentMap[node.type || "defaultNode"] ||
    formComponentMap["defaultNode"];

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${node.type || "Node"}`}
      clearData={clearData}
    >
      <div className="flex h-full flex-col gap-6">
        {/* Node ID / Info (Optional display) */}
        <p className="text-xs text-zinc-500">ID: {node.id}</p>

        {/* --- Render the Dynamically Loaded Form --- */}
        <Suspense
          fallback={
            <div className="text-center text-zinc-400">Loading form...</div>
          }
        >
          {SpecificFormComponent ? (
            <SpecificFormComponent ref={formRef} initialData={node.data} />
          ) : (
            <div className="text-center text-red-400">
              Error: Form for node type &quot;{node.type || "defaultNode"}&quot;
              not found.
            </div>
          )}
        </Suspense>

        {/* AI Data Display (Read-Only) */}
        {(aiSummary || extractedConcepts) && (
          <div className="flex-shrink-0">
            <h3 className="text-md mb-2 font-semibold text-zinc-200">
              AI Insights
            </h3>

            {aiSummary && (
              <div className="mb-3 max-h-24 overflow-y-auto text-sm text-zinc-400 italic">
                <span className="font-semibold">Summary:</span>

                <span>{aiSummary}</span>
              </div>
            )}

            {extractedConcepts && extractedConcepts.length > 0 && (
              <div className="max-h-24 overflow-y-auto text-sm text-zinc-400 italic">
                <span className="font-semibold">Concepts:</span>

                <span>{extractedConcepts.join(", ")}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-shrink-0 justify-end gap-3 border-t border-zinc-700 pt-4">
          <Button onClick={onClose} variant="outline" disabled={isLoading}>
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={isLoading || !SpecificFormComponent}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}

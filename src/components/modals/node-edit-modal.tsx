import React, {
  useState,
  useEffect,
  useRef,
  Suspense,
  lazy,
  ComponentType,
} from "react";
import Modal from "../modal";
import { NodeEditModalProps } from "@/types/node-edit-modal-props";
import { NodeData } from "@/types/node-data";

// Interface for the props expected by the specific node forms
interface SpecificNodeFormProps {
  initialData: NodeData;
}

// Interface for the ref exposed by the specific node forms
interface SpecificNodeFormRef {
  getFormData: () => Partial<NodeData> | null;
}

// --- Dynamic Imports for Node Forms ---
// Map node types to their lazy-loaded form components
const formComponentMap: Record<
  string,
  ComponentType<
    React.PropsWithRef<
      SpecificNodeFormProps & { ref: React.ForwardedRef<SpecificNodeFormRef> }
    >
  >
> = {
  defaultNode: lazy(
    () => import("../node-forms/default-node-form"), // Assuming a DefaultNodeForm exists
  ),
  taskNode: lazy(() => import("../node-forms/task-node-form")),
  imageNode: lazy(() => import("../node-forms/image-node-form")),
  questionNode: lazy(() => import("../node-forms/question-node-form")),
  resourceNode: lazy(() => import("../node-forms/resource-node-form")),
  annotationNode: lazy(() => import("../node-forms/annotation-node-form")),
  // Add other node types and their corresponding forms here
};
// ----------------------------------------

export default function NodeEditModal({
  isOpen,
  onClose,
  node,
  onSave,
  isLoading,
}: NodeEditModalProps) {
  // Ref to hold the instance of the dynamically loaded form
  const formRef = useRef<SpecificNodeFormRef>(null);

  // --- General Node State (handled directly in this modal) ---
  // Removed most state - keeping only AI display state for now
  // Content and General Properties state will be handled by the DefaultNodeForm
  // If you need *global* overrides (like changing node_type), keep state here.

  // AI Data Display State (read-only)
  const [aiSummary, setAiSummary] = useState<string | undefined>(undefined);
  const [extractedConcepts, setExtractedConcepts] = useState<
    string[] | undefined
  >(undefined);

  useEffect(() => {
    // Initialize AI data display state when node changes
    if (node) {
      setAiSummary(node.data?.aiSummary);
      setExtractedConcepts(node.data?.extractedConcepts);
    } else {
      setAiSummary(undefined);
      setExtractedConcepts(undefined);
    }
    // Clear AI data when modal closes
    if (!isOpen) {
      setAiSummary(undefined);
      setExtractedConcepts(undefined);
    }
  }, [node, isOpen]); // Depend on node and isOpen state

  const handleSave = async () => {
    if (!node || isLoading || !formRef.current) return;

    // Get data changes from the specific form component via its ref
    const specificFormData = formRef.current.getFormData();

    if (!specificFormData) {
      console.error("Could not get form data from the specific node form.");
      // Optionally show an error notification
      return;
    }

    // Combine changes (in this case, it's mostly just the specific form data)
    const changes: Partial<NodeData> = {
      ...specificFormData,
      // If the modal itself managed general fields like 'tags', merge them here:
      // tags: generalTagsState,
      // status: generalStatusState,
      // ...etc
    };

    await onSave(node.id, changes);
    // onSave function in parent should handle closing the modal and showing notification
  };

  // If node is null but modal is open, something is wrong, close it
  if (!isOpen || !node) return null;

  // Determine which specific form component to render
  const SpecificFormComponent =
    formComponentMap[node.type || "defaultNode"] ||
    formComponentMap["defaultNode"]; // Fallback to defaultNode form

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${node.type || "Node"}`} // Display node type
    >
      <div className="flex flex-col gap-6">
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
        {/* --------------------------------------------- */}

        {/* AI Data Display (Read-Only) */}
        {(aiSummary || extractedConcepts) && (
          <div>
            <h3 className="text-md mb-2 font-semibold text-zinc-200">
              AI Insights
            </h3>
            {aiSummary && (
              <div className="mb-3 max-h-24 overflow-y-auto text-sm text-zinc-400 italic">
                <span className="font-semibold">Summary:</span> {aiSummary}
              </div>
            )}
            {extractedConcepts && extractedConcepts.length > 0 && (
              <div className="max-h-24 overflow-y-auto text-sm text-zinc-400 italic">
                <span className="font-semibold">Concepts:</span>{" "}
                {extractedConcepts.join(", ")}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-sm border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-700 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-sm border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none disabled:opacity-50"
            disabled={isLoading || !SpecificFormComponent} // Also disable if form couldn't load
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

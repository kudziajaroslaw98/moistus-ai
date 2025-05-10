import { nodeTypesConfig } from "@/constants/node-types";
import { NodeData } from "@/types/node-data";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { SidePanel } from "../side-panel";
import { Button } from "../ui/button";
import { FormField } from "../ui/form-field";
import { Select } from "../ui/select";
import { Spinner } from "../ui/spinner";

// Define the interface for the props that each specific node form will receive
export interface NodeSpecificFormProps {
  initialData: Partial<NodeData>; // Changed from initialMetadata to initialData
  disabled?: boolean;
}

// Define the interface for the ref that each specific node form must expose
export interface NodeFormRef {
  getFormData: () => Partial<NodeData> | null;
}

// Lazy load form components
const DefaultNodeForm = React.lazy(
  () => import("../node-forms/default-node-form"),
);
const TextNodeForm = React.lazy(() => import("../node-forms/text-node-form"));
const ImageNodeForm = React.lazy(() => import("../node-forms/image-node-form"));
const ResourceNodeForm = React.lazy(
  () => import("../node-forms/resource-node-form"),
);
const QuestionNodeForm = React.lazy(
  () => import("../node-forms/question-node-form"),
);
const AnnotationNodeForm = React.lazy(
  () => import("../node-forms/annotation-node-form"),
);
const CodeNodeForm = React.lazy(() => import("../node-forms/code-node-form"));
const TaskNodeForm = React.lazy(() => import("../node-forms/task-node-form"));
// Add other forms here

const nodeSpecificForms: Record<
  keyof typeof nodeTypesConfig,
  React.LazyExoticComponent<
    React.ForwardRefExoticComponent<
      NodeSpecificFormProps & React.RefAttributes<NodeFormRef>
    >
  >
> = {
  defaultNode: DefaultNodeForm,
  textNode: TextNodeForm,
  imageNode: ImageNodeForm,
  resourceNode: ResourceNodeForm,
  questionNode: QuestionNodeForm,
  annotationNode: AnnotationNodeForm,
  codeNode: CodeNodeForm,
  taskNode: TaskNodeForm,
  // map other node types to their respective form components
};

interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clearData: () => void;
  node: NodeData | null;
  onSave: (nodeId: string, changes: Partial<NodeData>) => Promise<void>;
  isLoading: boolean;
}

const getDefaultMetadataForType = (
  nodeType: string,
): Partial<NodeData["metadata"]> => {
  const config = nodeTypesConfig[nodeType as keyof typeof nodeTypesConfig];
  return config?.defaultMetadata || {};
};

export default function NodeEditModal({
  isOpen,
  onClose,
  node,
  onSave,
  isLoading,
}: NodeEditModalProps) {
  const [selectedNodeType, setSelectedNodeType] =
    useState<string>("defaultNode");
  const [isSaving, setIsSaving] = useState(false);
  const [nodeData, setNodeData] = useState<Partial<NodeData>>({});
  const formRef = useRef<NodeFormRef>(null);

  useEffect(() => {
    if (node !== null && isOpen && !isLoading && !isSaving) {
      const currentType = node?.node_type || "defaultNode";
      setSelectedNodeType(currentType);
      setNodeData(node);
    }
  }, [node, isOpen, isLoading, isSaving]);

  console.log(node, "node");
  console.log(selectedNodeType, "selectedNodeType");

  const handleNodeTypeChange = (newType: string) => {
    if (!node || isLoading || isSaving || newType === selectedNodeType) return;
    setSelectedNodeType(newType);
  };

  const handleSave = async () => {
    if (!node || isLoading) return;

    let specificMetadata: Partial<NodeData["metadata"]> | null = null;

    if (formRef.current && formRef.current.getFormData) {
      specificMetadata = formRef.current.getFormData()?.metadata;
    }

    const changes: Partial<NodeData> = {
      content: formRef.current?.getFormData()?.content ?? null,
      node_type: selectedNodeType,
      metadata: specificMetadata,
      aiData: formRef.current?.getFormData()?.aiData ?? null,
    };

    if (
      specificMetadata &&
      Object.keys(specificMetadata).length === 0 &&
      selectedNodeType !== "defaultNode" &&
      selectedNodeType !== "groupNode"
    ) {
      const defaultMeta = getDefaultMetadataForType(selectedNodeType);

      if (
        JSON.stringify(specificMetadata) === JSON.stringify(defaultMeta) ||
        Object.keys(specificMetadata).length === 0
      ) {
        changes.metadata = null;
      }
    } else if (
      !specificMetadata &&
      selectedNodeType !== "defaultNode" &&
      selectedNodeType !== "groupNode"
    ) {
      changes.metadata = null;
    }

    console.log(changes, "changes");
    setIsSaving(true);
    await onSave(node.id, changes);
    setIsSaving(false);
    setNodeData((prev) => ({
      ...prev,
      ...changes,
      content: changes.content || prev.content || null,
      metadata: {
        ...prev.metadata,
        ...changes.metadata,
      },
      aiData: {
        ...prev.aiData,
        ...changes.aiData,
      },
    }));
  };

  const NodeSpecificFormComponent = nodeSpecificForms[selectedNodeType] || null;
  const nodeTypeLabel =
    nodeTypesConfig[selectedNodeType as keyof typeof nodeTypesConfig]?.label ||
    selectedNodeType;

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Node: ${nodeTypeLabel}`}
    >
      <div className="flex flex-col gap-4">
        <FormField id="nodeType" label="Node Type">
          <Select
            id="nodeType"
            value={selectedNodeType}
            onChange={(e) => handleNodeTypeChange(e.target.value)}
            disabled={isLoading}
          >
            {Object.keys(nodeTypesConfig).map((typeKey) => (
              <option key={typeKey} value={typeKey}>
                {nodeTypesConfig[typeKey as keyof typeof nodeTypesConfig]
                  .label || typeKey}
              </option>
            ))}
          </Select>
        </FormField>

        <Suspense
          fallback={
            <div className="flex justify-center items-center h-20">
              <Spinner />
            </div>
          }
        >
          {NodeSpecificFormComponent && (
            <NodeSpecificFormComponent
              ref={formRef}
              initialData={nodeData}
              disabled={isLoading}
            />
          )}

          {!NodeSpecificFormComponent && selectedNodeType !== "defaultNode" && (
            <p className="text-sm text-zinc-500 italic">
              No specific properties form configured for this node type.
            </p>
          )}
        </Suspense>

        <div className="mt-auto flex flex-shrink-0 justify-end gap-3 border-t border-zinc-700 pt-4">
          <Button onClick={onClose} variant="outline" disabled={isLoading}>
            Cancel
          </Button>

          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}

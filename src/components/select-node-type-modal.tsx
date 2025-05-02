import Modal from "./modal";
import { nodeTypes } from "@/constants/node-types"; // Import available types
import {
  FileText, // defaultNode (text note)
  CheckSquare, // taskNode
  Image, // imageNode
  HelpCircle, // questionNode
  Link,
  MessageSquare, // resourceNode
} from "lucide-react"; // Import Lucide icons
import { Button } from "./ui/button";

interface SelectNodeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (nodeType: string) => void;
}

// Mapping for display names and icons
// Ensure this maps all keys in nodeTypes
const nodeTypeDisplayInfo: Record<
  string,
  { name: string; icon: React.ElementType }
> = {
  defaultNode: { name: "Basic Note", icon: FileText }, // Display name for the new default
  taskNode: { name: "Task", icon: CheckSquare },
  imageNode: { name: "Image", icon: Image },
  questionNode: { name: "Question", icon: HelpCircle },
  resourceNode: { name: "Resource/Link", icon: Link },
  annotationNode: { name: "Annotation", icon: MessageSquare }, // Add if annotationNode is uncommented
};

export default function SelectNodeTypeModal({
  isOpen,
  onClose,
  onSelectType,
}: SelectNodeTypeModalProps) {
  // Filter out any types that don't have display info if necessary,
  // but ideally nodeTypes and nodeTypeDisplayInfo should be in sync.
  const availableTypes = Object.keys(nodeTypes).filter((type) =>
    nodeTypeDisplayInfo.hasOwnProperty(type),
  );

  // Sort alphabetically by display name for better UX
  availableTypes.sort((a, b) =>
    nodeTypeDisplayInfo[a].name.localeCompare(nodeTypeDisplayInfo[b].name),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Node Type">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {availableTypes.map((type) => {
          const { name, icon: Icon } = nodeTypeDisplayInfo[type];
          return (
            <Button
              key={type}
              variant="secondary"
              onClick={() => onSelectType(type)}
              className="flex h-auto items-center justify-center gap-4 p-4"
            >
              <>
                <Icon size={20} className="text-teal-400" />
                <span className="text-xs">{name}</span>
              </>
            </Button>
          );
        })}
      </div>
    </Modal>
  );
}

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
            <button
              key={type}
              onClick={() => onSelectType(type)}
              className="flex flex-col items-center justify-center rounded-sm border border-zinc-600 bg-zinc-700 p-4 text-sm text-zinc-100 shadow-sm transition-colors hover:bg-teal-700 hover:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 "
            >
              <Icon size={24} className="mb-2 text-teal-400" /> {/* Icon */}
              {name} {/* Display name */}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

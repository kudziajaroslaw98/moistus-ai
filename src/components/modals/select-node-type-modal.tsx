import { nodeTypes } from "@/constants/node-types";
import {
  CheckSquare,
  Code,
  FileText,
  GroupIcon,
  HelpCircle,
  Image,
  Link,
  MessageSquare,
} from "lucide-react";
import Modal from "../modal";
import { Button } from "../ui/button";

interface SelectNodeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (nodeType: string) => void;
}

const nodeTypeDisplayInfo: Record<
  string,
  { name: string; icon: React.ElementType }
> = {
  defaultNode: { name: "Basic Note", icon: FileText },
  taskNode: { name: "Task", icon: CheckSquare },
  imageNode: { name: "Image", icon: Image },
  questionNode: { name: "Question", icon: HelpCircle },
  resourceNode: { name: "Resource/Link", icon: Link },
  groupNode: { name: "Group", icon: GroupIcon },
  annotationNode: { name: "Annotation", icon: MessageSquare },
  codeNode: { name: "Code Snippet", icon: Code },
};

export default function SelectNodeTypeModal({
  isOpen,
  onClose,
  onSelectType,
}: SelectNodeTypeModalProps) {
  const availableTypes = Object.keys(nodeTypes).filter((type) =>
    nodeTypeDisplayInfo.hasOwnProperty(type),
  );

  availableTypes.sort((a, b) =>
    nodeTypeDisplayInfo[a].name.localeCompare(nodeTypeDisplayInfo[b].name),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Node Type">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {availableTypes.map((type) => {
          if (type === "groupNode") return null;

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

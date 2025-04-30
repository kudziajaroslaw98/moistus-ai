import BaseEditableNode from "@/components/nodes/base-editable-node";
import ImageNode from "@/components/nodes/image-node";
import QuestionNode from "@/components/nodes/question-node";
import ResourceNode from "@/components/nodes/resource-node";
import TaskNode from "@/components/nodes/task-node";

export const nodeTypes = {
  editableNode: BaseEditableNode,
  taskNode: TaskNode,
  imageNode: ImageNode,
  questionNode: QuestionNode,
  resourceNode: ResourceNode,
};

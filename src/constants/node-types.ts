import AnnotationNode from "@/components/nodes/annotation-node";
import CodeNode from "@/components/nodes/code-node";
import DefaultNode from "@/components/nodes/default-node";
import GroupNode from "@/components/nodes/group-node";
import ImageNode from "@/components/nodes/image-node";
import QuestionNode from "@/components/nodes/question-node";
import ResourceNode from "@/components/nodes/resource-node";
import TaskNode from "@/components/nodes/task-node";
import TextNode from "@/components/nodes/text-node"; // Import the new TextNode

export const nodeTypes = {
  defaultNode: DefaultNode, // Note Node
  taskNode: TaskNode,
  imageNode: ImageNode,
  questionNode: QuestionNode,
  resourceNode: ResourceNode,
  annotationNode: AnnotationNode,
  groupNode: GroupNode,
  codeNode: CodeNode,
  textNode: TextNode, // Add the new TextNode
};

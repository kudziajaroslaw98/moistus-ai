import AnnotationNode from "@/components/nodes/annotation-node";
import DefaultNode from "@/components/nodes/default-node";
import ImageNode from "@/components/nodes/image-node";
import QuestionNode from "@/components/nodes/question-node";
import ResourceNode from "@/components/nodes/resource-node";
import TaskNode from "@/components/nodes/task-node";

export const nodeTypes = {
  defaultNode: DefaultNode,
  taskNode: TaskNode,
  imageNode: ImageNode,
  questionNode: QuestionNode,
  resourceNode: ResourceNode,
  annotationNode: AnnotationNode,
};

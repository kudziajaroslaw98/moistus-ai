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

import { NodeData } from "@/types/node-data";

interface NodeTypeConfig {
  label: string;
  defaultMetadata: Partial<NodeData["metadata"]>;
}

export const nodeTypesConfig: Record<string, NodeTypeConfig> = {
  defaultNode: {
    label: "Note",
    defaultMetadata: {},
  },
  textNode: {
    label: "Text",
    defaultMetadata: {
      fontSize: "14px",
      textAlign: "left",
      showBackground: false,
      backgroundColor: "#3f3f46",
      textColor: "#fafafa",
    },
  },
  imageNode: {
    label: "Image",
    defaultMetadata: {
      imageUrl: "",
      altText: "",
      caption: "",
      showCaption: true,
    },
  },
  resourceNode: {
    label: "Resource",
    defaultMetadata: {
      url: "",
      faviconUrl: "",
      thumbnailUrl: "",
      summary: "",
      showThumbnail: true,
      showSummary: true,
    },
  },
  questionNode: {
    label: "Question",
    defaultMetadata: {
      answer: "",
    },
  },
  annotationNode: {
    label: "Annotation",
    defaultMetadata: {
      annotationType: "comment",
      fontSize: "12px",
      fontWeight: "normal",
    },
  },
  codeNode: {
    label: "Code Snippet",
    defaultMetadata: {
      language: "javascript",
      showLineNumbers: true,
      fileName: "",
    },
  },
  taskNode: {
    label: "Task",
    defaultMetadata: {
      tasks: [],
      dueDate: undefined,
      priority: undefined,
    },
  },
};

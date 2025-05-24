export interface BuilderElement {
  id: string;
  type: "text" | "image" | "video" | "status" | "tag" | "shape" | "icon";
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties: Record<string, any>;
  style?: React.CSSProperties;
}

export interface BuilderCanvas {
  id: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  columnWidth: number;
  rowHeight: number;
  columnGap: number;
  rowGap: number;
  elements: BuilderElement[];
}

export interface BuilderNodeData {
  canvas: BuilderCanvas;
  lastModified: string;
}

export interface ElementType {
  id: string;
  name: string;
  icon: React.ElementType;
  defaultProperties: Record<string, any>;
  defaultSize: {
    width: number;
    height: number;
  };
}

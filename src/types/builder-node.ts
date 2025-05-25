// Base properties for all elements
interface BaseElementProperties {
  // Common properties can go here if any in the future
}

// Specific properties for TextElement
export interface TextElementProperties extends BaseElementProperties {
  text: string;
  fontSize?: string; // e.g., '16px'
  fontFamily?: string;
  textColor?: string; // e.g., '#000000'
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  // other text-specific properties...
}

// Specific properties for ImageElement
export interface ImageElementProperties extends BaseElementProperties {
  src: string;
  alt?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

// Specific properties for VideoElement
export interface VideoElementProperties extends BaseElementProperties {
  src: string;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
}

// Specific properties for StatusElement
export interface StatusElementProperties extends BaseElementProperties {
  status: 'active' | 'inactive' | 'pending'; // Example statuses
  label?: string;
}

// Specific properties for TagElement
export interface TagElementProperties extends BaseElementProperties {
  tagText: string;
  tagColor?: string; // background color
  textColor?: string;
}

// Specific properties for ShapeElement
export interface ShapeElementProperties extends BaseElementProperties {
  shapeType: 'rectangle' | 'circle' | 'triangle'; // Example shapes
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

// Specific properties for IconElement
export interface IconElementProperties extends BaseElementProperties {
  iconName: string; // e.g., 'user', 'settings' (from an icon library)
  iconSize?: string; // e.g., '24px'
  iconColor?: string;
}

// Specific properties for LinkElement
export interface LinkElementProperties extends BaseElementProperties {
  url: string;
  linkText: string;
  displayStyle: 'link' | 'button';
  buttonTextColor?: string; // Only if displayStyle is 'button'
  buttonBackgroundColor?: string; // Only if displayStyle is 'button'
  // Common link/button properties like target (_blank, _self) can be added here
  target?: '_blank' | '_self' | '_parent' | '_top';
  fontSize?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right'; // For button text alignment
}

// Union of all possible element property types
export type ElementProperties =
  | TextElementProperties
  | ImageElementProperties
  | VideoElementProperties
  | StatusElementProperties
  | TagElementProperties
  | ShapeElementProperties
  | IconElementProperties
  | LinkElementProperties;

// Define the main BuilderElement type
export interface BuilderElement {
  id: string;
  type: "text" | "image" | "video" | "status" | "tag" | "shape" | "icon" | "link"; // Added 'link'
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties: ElementProperties; // Use the union type
  style?: React.CSSProperties; // General purpose styles, try to use properties for semantic styling
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

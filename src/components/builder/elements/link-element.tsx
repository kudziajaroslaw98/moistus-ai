import type { BuilderElement, LinkElementProperties, ElementType as BuilderElementType } from "@/types/builder-node";
import { cn } from "@/utils/cn";
import type { CSSProperties, MouseEvent } from "react";
import { LinkIcon } from "lucide-react"; // Placeholder icon, replace if needed

export interface LinkElementProps {
  element: BuilderElement; // Specifically, one where element.properties is LinkElementProperties
  isEditing?: boolean;
  // onUpdate is not directly used by this component for its own content, but might be needed for consistency or future features
  // onUpdate?: (updatedElement: Partial<BuilderElement>) => void;
}

export function LinkElement({ element, isEditing = false }: LinkElementProps): JSX.Element {
  const properties = element.properties as LinkElementProperties;
  const { 
    url = '#',
    linkText = 'Link',
    displayStyle = 'link',
    buttonTextColor = '#FFFFFF',
    buttonBackgroundColor = '#000000',
    target = '_self',
    fontSize = 'inherit',
    fontFamily = 'inherit',
    textAlign = 'center',
  } = properties;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (isEditing) {
      event.preventDefault();
      // Optionally, could trigger selection or open settings here if needed
      console.log("Link clicked in edit mode, navigation prevented.");
    }
    // If not editing, the default link behavior (navigation) will occur.
  };

  const baseClasses = "w-full h-full flex items-center justify-center break-words";
  const linkStyles: CSSProperties = {
    fontSize,
    fontFamily,
    textDecoration: displayStyle === 'link' ? 'underline' : 'none',
    color: displayStyle === 'link' ? 'blue' : buttonTextColor, // Basic link color, or button text color
    textAlign: displayStyle === 'button' ? textAlign : undefined,
  };

  const buttonSpecificClasses = displayStyle === 'button' 
    ? "px-4 py-2 rounded-md transition-colors duration-150 ease-in-out"
    : "";
  
  const buttonSpecificStyles: CSSProperties = displayStyle === 'button' 
    ? {
        backgroundColor: buttonBackgroundColor,
        // Ensure text color is applied if it's a button
        color: buttonTextColor, 
      }
    : {};

  return (
    <a
      href={url}
      target={target}
      onClick={handleClick}
      className={cn(
        baseClasses,
        buttonSpecificClasses,
        isEditing && "cursor-default pointer-events-auto", // Ensure it's clickable in edit mode to trigger preventDefault
        !isEditing && displayStyle === 'link' && "hover:text-blue-700",
        !isEditing && displayStyle === 'button' && "hover:opacity-90" // Example hover for button
      )}
      style={{ ...linkStyles, ...buttonSpecificStyles }}
      // Prevent dragging the link itself, as the parent motion.div handles dragging
      draggable="false" 
    >
      {linkText}
    </a>
  );
}

export const linkElementType: BuilderElementType = {
  id: "link",
  name: "Link/Button",
  icon: LinkIcon, // Replace with a more specific icon if available
  defaultProperties: {
    url: "https://example.com",
    linkText: "Click Here",
    displayStyle: "button",
    buttonTextColor: "#FFFFFF",
    buttonBackgroundColor: "#007bff", // Default blue button
    target: "_blank",
    fontSize: "16px",
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
  } as LinkElementProperties,
  defaultSize: {
    width: 150,
    height: 40,
  },
};

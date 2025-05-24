import type { BuilderElement } from "@/types/builder-node";
import React from "react";
import { TextSettingsForm } from "./text-settings-form";

interface SettingsPopoverProps {
  selectedElement: BuilderElement | null;
  onUpdateElement: (updatedElement: BuilderElement) => void;
  onClose: () => void;
  // TODO: Add props for positioning the popover
}

export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  selectedElement,
  onUpdateElement,
  onClose,
}) => {
  if (!selectedElement) {
    return null;
  }

  const renderSettingsForm = () => {
    switch (selectedElement.type) {
      case "text":
        return (
          <TextSettingsForm
            element={selectedElement}
            onUpdate={(newProperties) => {
              onUpdateElement({ ...selectedElement, properties: newProperties });
            }}
          />
        );
      // TODO: Add cases for other element types
      // case "image":
      //   return <ImageSettingsForm element={selectedElement} onUpdate={onUpdateElement} />;
      default:
        return <p>No settings available for this element type.</p>;
    }
  };

  return (
    <div
      className="absolute z-20 p-4 bg-white border border-gray-300 rounded-lg shadow-lg top-10 right-10 min-w-[250px]"
      // TODO: Implement proper positioning logic
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">
          {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)} Settings
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close settings"
        >
          &times; {/* Simple 'x' icon for close */}
        </button>
      </div>
      {renderSettingsForm()}
    </div>
  );
};

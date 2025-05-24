import type { BuilderElement } from "@/types/builder-node";
import React, { useState, useEffect } from 'react';

interface TextSettingsFormProps {
  element: BuilderElement & { type: 'text' }; // Ensure element is of type 'text'
  onUpdate: (properties: BuilderElement['properties']) => void;
}

export const TextSettingsForm: React.FC<TextSettingsFormProps> = ({ element, onUpdate }) => {
  // Assuming text elements have a 'text' property
  const [textContent, setTextContent] = useState(element.properties.text || '');

  useEffect(() => {
    setTextContent(element.properties.text || '');
  }, [element.properties.text]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onUpdate({ ...element.properties, text: textContent });
  };
  
  // Auto-save on blur or text change with debounce could be an improvement here
  const handleBlur = () => {
    onUpdate({ ...element.properties, text: textContent });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="textContent" className="block text-sm font-medium text-gray-700">
          Text Content
        </label>
        <textarea
          id="textContent"
          name="textContent"
          rows={3}
          className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={textContent}
          onChange={handleTextChange}
          onBlur={handleBlur} // Update on blur
        />
      </div>
      {/* Add more text settings here as per requirements (font, size, color, etc.) */}
      {/* <button 
        type="submit"
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Apply Changes
      </button> */}
      <p className="text-xs text-gray-500">Changes are applied on blur.</p>
    </form>
  );
};

import { Input } from "@/components/ui/input";
// Label will be implicitly used by FormField
import { FormField } from "@/components/ui/form-field"; // Added import
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import type {
  BuilderElement,
  LinkElementProperties,
} from "@/types/builder-node";
import {
  ReactNode,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

export interface LinkSettingsFormProps {
  element: BuilderElement; // Specifically one where element.properties is LinkElementProperties
  onUpdate: (updatedProperties: Partial<LinkElementProperties>) => void;
}

export function LinkSettingsForm({
  element,
  onUpdate,
}: LinkSettingsFormProps): ReactNode {
  const initialProps = element.properties as LinkElementProperties;
  const [formData, setFormData] = useState<LinkElementProperties>(initialProps);

  useEffect(() => {
    setFormData(element.properties as LinkElementProperties);
  }, [element.properties]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // handleSelectChange is no longer needed in this exact form, as handleChange can be used with HTMLSelectElement
  // If specific logic for select was needed, it would be adapted or merged into handleChange.

  const handleRadioChange = (name: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset button-specific styles if switching to 'link'
      ...(name === "displayStyle" &&
        value === "link" && {
          buttonTextColor: undefined,
          buttonBackgroundColor: undefined,
          textAlign: prev.textAlign, // Keep existing or reset to a default if needed
        }),
    }));
    // Trigger blur to save changes immediately after radio change for responsiveness
    handleBlur();
  };

  // Debounced update or on blur/submit
  const handleSubmit = (e?: FormEvent<HTMLFormElement>): void => {
    e?.preventDefault();
    onUpdate(formData);
  };

  // Update on blur for text inputs
  const handleBlur = (): void => {
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Link Text" id="linkText">
        <Input
          id="linkText"
          name="linkText"
          value={formData.linkText || ""}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </FormField>

      <FormField label="URL" id="url">
        <Input
          id="url"
          name="url"
          type="url"
          value={formData.url || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="https://example.com"
        />
      </FormField>

      <FormField label="Display Style" id="displayStyle">
        <RadioGroup
          name="displayStyle" // RadioGroup itself doesn't need an id if FormField's label points to the concept
          value={formData.displayStyle || "link"}
          onValueChange={(value) => handleRadioChange("displayStyle", value)}
          className="flex space-x-2 pt-1" // Added pt-1 for alignment with label if needed
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="link" id="ds-link" />

            {/* Using Label from Radix/Shadcn for RadioGroupItem is conventional */}
            <label
              htmlFor="ds-link"
              className="text-sm font-medium cursor-pointer"
            >
              Link
            </label>
          </div>

          <div className="flex items-center space-x-1">
            <RadioGroupItem value="button" id="ds-button" />

            <label
              htmlFor="ds-button"
              className="text-sm font-medium cursor-pointer"
            >
              Button
            </label>
          </div>
        </RadioGroup>
      </FormField>

      <FormField label="Target" id="target">
        <Select
          id="target"
          name="target"
          value={formData.target || "_self"}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            handleChange(e);
            handleBlur();
          }}
        >
          <option value="_self">Same Tab (_self)</option>

          <option value="_blank">New Tab (_blank)</option>

          <option value="_parent">Parent Frame (_parent)</option>

          <option value="_top">Full Body (_top)</option>
        </Select>
      </FormField>

      <FormField label="Font Size (e.g., 16px)" id="fontSize">
        <Input
          id="fontSize"
          name="fontSize"
          value={formData.fontSize || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="16px"
        />
      </FormField>

      {formData.displayStyle === "button" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bg Color" id="buttonBackgroundColor">
              <Input
                id="buttonBackgroundColor"
                name="buttonBackgroundColor"
                type="color"
                value={formData.buttonBackgroundColor || "#000000"}
                onChange={handleChange}
                onBlur={handleBlur}
                className="h-10 w-full" // Ensure color input takes full width of its grid cell
              />
            </FormField>

            <FormField label="Text Color" id="buttonTextColor">
              <Input
                id="buttonTextColor"
                name="buttonTextColor"
                type="color"
                value={formData.buttonTextColor || "#FFFFFF"}
                onChange={handleChange}
                onBlur={handleBlur}
                className="h-10 w-full"
              />
            </FormField>
          </div>

          <FormField label="Button Text Align" id="textAlign">
            <Select
              id="textAlign"
              name="textAlign"
              value={formData.textAlign || "center"}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                handleChange(e);
                handleBlur();
              }}
            >
              <option value="left">Left</option>

              <option value="center">Center</option>

              <option value="right">Right</option>
            </Select>
          </FormField>
        </>
      )}
    </form>
  );
}

import { edgeTypes } from "@/constants/edge-types";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { Node } from "@xyflow/react";
import { SquareX } from "lucide-react";
import { useEffect, useState } from "react";
import { SidePanel } from "../side-panel";
import { Button } from "../ui/button";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

const availableEdgeTypes = Object.keys(edgeTypes);
const markerEndOptions = [
  { value: "none", label: "None" },
  { value: "arrow", label: "Default Arrow" },
  { value: "arrowclosed", label: "Closed Arrow" },
];

interface EdgeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clearData: () => void;
  edge: AppEdge | null;
  onSave: (edgeId: string, changes: Partial<EdgeData>) => Promise<void>;
  isLoading: boolean;
  nodes: Node<NodeData>[];
}

export default function EdgeEditModal({
  isOpen,
  onClose,
  clearData,
  edge,
  onSave,
  isLoading,
  nodes,
}: EdgeEditModalProps) {
  const [label, setLabel] = useState<string>("");
  const [type, setType] = useState("smoothstep");
  const [animated, setAnimated] = useState(false);
  const [color, setColor] = useState<string | undefined>("#6c757d");
  const [strokeWidth, setStrokeWidth] = useState<number | undefined>(undefined);
  const [markerEnd, setMarkerEnd] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (edge) {
      setLabel((edge.label as string) || (edge.data?.label as string) || "");
      setType(edge.type || edge.data?.type || "smoothstep");
      setAnimated(edge.animated ?? edge.data?.animated ?? false);
      setColor((edge.style?.stroke as string) || edge.data?.color || "#6c757d");
      setStrokeWidth(
        (edge.style?.strokeWidth as number) ||
          edge.data?.strokeWidth ||
          undefined,
      );
      setMarkerEnd(
        (edge.markerEnd as string) ||
          (edge.data?.markerEnd as string) ||
          "none",
      );
    } else {
      setLabel("");
      setType("smoothstep");
      setAnimated(false);
      setColor("#6c757d");
      setStrokeWidth(undefined);
      setMarkerEnd(undefined);
    }

    if (!isOpen) {
      setLabel("");
      setType("smoothstep");
      setAnimated(false);
      setColor("#6c757d");
      setStrokeWidth(undefined);
      setMarkerEnd(undefined);
    }
  }, [edge, isOpen]);

  const handleSave = async () => {
    if (!edge || isLoading) return;
    const changes: Partial<EdgeData> = {
      label: label.trim() === "" ? undefined : label.trim(),
      type: type,
      animated: animated,
      color: color,
      strokeWidth: strokeWidth,
      markerEnd: markerEnd === "none" ? undefined : markerEnd,
    };

    await onSave(edge.id, changes);
  };

  if (!edge) return null;

  const sourceNodeContent =
    nodes.find((n) => n.id === edge.source)?.data?.content || edge.source;
  const targetNodeContent =
    nodes.find((n) => n.id === edge.target)?.data?.content || edge.target;

  const getContentSnippet = (content: string): string => {
    if (!content) return "<Empty>";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const textContent = (tempDiv.textContent || tempDiv.innerText || "").trim();
    return textContent.length > 30
      ? textContent.substring(0, 30) + "..."
      : textContent || "<Empty>";
  };

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Connection`}
      clearData={clearData}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-400">
          <span>From: </span>

          <span className="font-semibold text-zinc-200 italic">
            {getContentSnippet(sourceNodeContent)}
          </span>
        </p>

        <p className="text-sm text-zinc-400">
          <span>To: </span>

          <span className="font-semibold text-zinc-200 italic">
            {getContentSnippet(targetNodeContent)}
          </span>
        </p>

        <hr className="my-2 border-zinc-700" />

        <div>
          <h3 className="text-md mb-2 font-semibold text-zinc-200">
            Properties
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="edgeLabel" label="Label">
              <Input
                id="edgeLabel"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isLoading}
                placeholder="e.g., leads to, is part of"
              />
            </FormField>

            <FormField id="edgeType" label="Type">
              <Select
                id="edgeType"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={isLoading}
              >
                {availableEdgeTypes.map((edgeType) => (
                  <option key={edgeType} value={edgeType}>
                    {edgeType}
                  </option>
                ))}
              </Select>
            </FormField>

            <div>
              <FormField id="edgeAnimated" label="Animated">
                <Input
                  type="checkbox"
                  checked={animated}
                  onChange={(e) => setAnimated(e.target.checked)}
                  className="mr-2 rounded border-zinc-600 text-teal-600 shadow-sm focus:ring-teal-500 disabled:opacity-50"
                  disabled={isLoading}
                />
              </FormField>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-md mb-2 font-semibold text-zinc-200">
            Appearance
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="edgeColor"
                className="block text-sm font-medium text-zinc-400"
              >
                Color
              </Label>

              <div className="flex items-center gap-2">
                <Input
                  id="edgeColor"
                  type="color"
                  value={color || "#000000"}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={isLoading}
                />

                {color && (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setColor(undefined)}
                  >
                    <SquareX className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Stroke Width Input */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="strokeWidth"
                className="block text-sm font-medium text-zinc-400"
              >
                Stroke Width (px)
              </Label>

              <div className="flex items-center gap-2">
                <Input
                  id="strokeWidth"
                  type="number"
                  value={strokeWidth ?? ""}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setStrokeWidth(
                      isNaN(value) || value <= 0 ? undefined : value,
                    );
                  }}
                  min="1"
                  max="10"
                  disabled={isLoading}
                  placeholder="e.g. 2"
                />

                {strokeWidth !== undefined && (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setStrokeWidth(undefined)}
                  >
                    <SquareX className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Marker End Select */}
            <div>
              <Label
                htmlFor="markerEnd"
                className="block text-sm font-medium text-zinc-400"
              >
                Arrow Style (Marker End)
              </Label>

              <Select
                id="markerEnd"
                value={markerEnd || "none"}
                onChange={(e) =>
                  setMarkerEnd(
                    e.target.value === "none" ? undefined : e.target.value,
                  )
                }
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                disabled={isLoading}
              >
                {markerEndOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Keep footer outside the scrollable area if SidePanel doesn't include one */}
        {/* If SidePanel's children area scrolls, footer needs to be positioned separately or within */}
        <div className="mt-auto flex flex-shrink-0 justify-end gap-3 border-t border-zinc-700 pt-4">
          <Button onClick={onClose} variant="outline" disabled={isLoading}>
            Cancel
          </Button>

          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}

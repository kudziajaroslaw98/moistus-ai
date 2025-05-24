import { BuilderElement } from "@/types/builder-node";
import { Circle } from "lucide-react";
import { memo } from "react";

interface StatusElementProps {
  element: BuilderElement;
  isSelected?: boolean;
  isEditing?: boolean;
  onUpdate?: (element: BuilderElement) => void;
}

const StatusElementComponent = ({
  element,
  isSelected = false,
  isEditing = false,
  onUpdate,
}: StatusElementProps) => {
  const { properties } = element;
  const { status = "active", label = "Status", color = "#10b981" } = properties;

  const statusColors = {
    active: "#10b981",
    inactive: "#6b7280",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
  };

  const handleStatusChange = (newStatus: string) => {
    if (onUpdate) {
      onUpdate({
        ...element,
        properties: {
          ...properties,
          status: newStatus,
          color: statusColors[newStatus as keyof typeof statusColors] || color,
        },
      });
    }
  };

  return (
    <div
      className={`
        w-full h-full flex items-center justify-center gap-2 p-2 rounded
        ${isSelected ? "ring-2 ring-teal-500" : ""}
        ${isEditing ? "bg-zinc-800" : ""}
      `}
    >
      <Circle className="w-3 h-3 fill-current" style={{ color }} />

      {isEditing ? (
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-zinc-700 text-white text-xs rounded px-1"
        >
          <option value="active">Active</option>

          <option value="inactive">Inactive</option>

          <option value="warning">Warning</option>

          <option value="error">Error</option>

          <option value="info">Info</option>
        </select>
      ) : (
        <span className="text-xs font-medium">{label}</span>
      )}
    </div>
  );
};

export const StatusElement = memo(StatusElementComponent);

export const statusElementType = {
  id: "status",
  name: "Status",
  icon: Circle,
  defaultProperties: {
    status: "active",
    label: "Status",
    color: "#10b981",
  },
  defaultSize: {
    width: 2,
    height: 1,
  },
};

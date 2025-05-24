import { BuilderCanvas } from "@/types/builder-node";
import { memo } from "react";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";

interface CanvasControlsProps {
  canvas: BuilderCanvas;
  onCanvasUpdate: (canvas: BuilderCanvas) => void;
}

const CanvasControlsComponent = ({
  canvas,
  onCanvasUpdate,
}: CanvasControlsProps) => {
  const updateCanvas = (updates: Partial<BuilderCanvas>) => {
    onCanvasUpdate({ ...canvas, ...updates });
  };

  return (
    <div className="w-full bg-zinc-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-zinc-200">
        Canvas Settings
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Columns" id="columns">
            <Input
              id="columns"
              type="number"
              value={canvas.columns}
              onChange={(e) =>
                updateCanvas({ columns: parseInt(e.target.value) || 1 })
              }
              min="1"
              max="20"
            />
          </FormField>

          <FormField label="Rows" id="rows">
            <Input
              id="rows"
              type="number"
              value={canvas.rows}
              onChange={(e) =>
                updateCanvas({ rows: parseInt(e.target.value) || 1 })
              }
              min="1"
              max="20"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="Col Width" id="colWidth">
            <Input
              id="colWidth"
              type="number"
              value={canvas.columnWidth}
              onChange={(e) =>
                updateCanvas({ columnWidth: parseInt(e.target.value) || 40 })
              }
              min="20"
              max="200"
            />
          </FormField>

          <FormField label="Row Height" id="rowHeight">
            <Input
              id="rowHeight"
              type="number"
              value={canvas.rowHeight}
              onChange={(e) =>
                updateCanvas({ rowHeight: parseInt(e.target.value) || 40 })
              }
              min="20"
              max="200"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="Col Gap" id="colGap">
            <Input
              id="colGap"
              type="number"
              value={canvas.columnGap}
              onChange={(e) =>
                updateCanvas({ columnGap: parseInt(e.target.value) || 0 })
              }
              min="0"
              max="20"
            />
          </FormField>

          <FormField label="Row Gap" id="rowGap">
            <Input
              id="rowGap"
              type="number"
              value={canvas.rowGap}
              onChange={(e) =>
                updateCanvas({ rowGap: parseInt(e.target.value) || 0 })
              }
              min="0"
              max="20"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export const CanvasControls = memo(CanvasControlsComponent);

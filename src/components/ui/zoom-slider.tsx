"use client";

import {
  Panel,
  PanelProps,
  useReactFlow,
  useStore,
  useViewport,
} from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";
import { forwardRef, useCallback } from "react";
import { Button } from "./button";
import { Slider } from "./slider";
import { cn } from "@/utils/cn";

export const ZoomSlider = forwardRef<
  HTMLDivElement,
  Omit<PanelProps, "children">
>(({ className, position = "bottom-center", ...props }, ref) => {
  const { zoom } = useViewport();
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow();

  const { minZoom, maxZoom } = useStore(
    (state) => ({
      minZoom: state.minZoom,
      maxZoom: state.maxZoom,
    }),
    (a, b) => a.minZoom !== b.minZoom || a.maxZoom !== b.maxZoom,
  );

  const handleZoomChange = useCallback((values: number[]) => {
    if (values.length > 0) {
      zoomTo(values[0], { duration: 100 });
    }
  }, [zoomTo]);

  return (
    <Panel
      ref={ref}
      position={position}
      className={cn(
        "flex gap-1 rounded-md bg-zinc-800/80 p-1 text-zinc-200 backdrop-blur-sm border border-zinc-700 shadow-md",
        className,
      )}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomOut({ duration: 300 })}
        title="Zoom out"
      >
        <Minus className="size-4" />
      </Button>
      
      <Slider
        className="w-[140px]"
        value={[zoom]}
        min={minZoom}
        max={maxZoom}
        step={0.01}
        onValueChange={handleZoomChange}
      />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomIn({ duration: 300 })}
        title="Zoom in"
      >
        <Plus className="size-4" />
      </Button>
      
      <Button
        className="min-w-16 tabular-nums text-xs"
        variant="ghost"
        onClick={() => zoomTo(1, { duration: 300 })}
        title="Reset zoom to 100%"
      >
        {(100 * zoom).toFixed(0)}%
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fitView({ duration: 300, padding: 0.1 })}
        title="Fit view"
      >
        <Maximize className="size-4" />
      </Button>
    </Panel>
  );
});

ZoomSlider.displayName = "ZoomSlider";
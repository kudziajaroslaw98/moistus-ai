"use client";

import { MindMapProvider } from "@/contexts/mind-map/mind-map-provider";
import { ReactFlowProvider } from "@xyflow/react";
import { MindMapCanvas } from "./mind-map-canvas";

export default function MindMapPageWrapper() {
  return (
    <ReactFlowProvider>
      <MindMapProvider>
        <MindMapCanvas />
      </MindMapProvider>
    </ReactFlowProvider>
  );
}

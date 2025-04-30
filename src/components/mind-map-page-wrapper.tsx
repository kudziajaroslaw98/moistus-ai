"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { MindMapCanvas } from "./mind-map-canvas";

export default function MindMapPageWrapper() {
  return (
    <ReactFlowProvider>
      <MindMapCanvas />
    </ReactFlowProvider>
  );
}

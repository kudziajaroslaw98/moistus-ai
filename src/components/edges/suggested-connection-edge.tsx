// import { useMindMapContext } from "@/store/mind-map-context";
// import { EdgeData } from "@/types/edge-data";
// import {
//   Edge,
//   EdgeLabelRenderer,
//   EdgeProps,
//   getBezierPath,
// } from "@xyflow/react";
// import { memo, useCallback } from "react";
// import { Button } from "../ui/button";

// const SuggestedConnectionEdgeComponent = ({
//   id,
//   sourceX,
//   sourceY,
//   targetX,
//   targetY,
//   markerEnd,
//   style = { stroke: "orange", strokeDasharray: "5 5", strokeWidth: 2 },
//   ...props
// }: EdgeProps<Edge<EdgeData>>) => {
//   const data = props.data;
//   // const { aiActions } = useMindMapContext();

//   const [edgePath, labelX, labelY] = getBezierPath({
//     sourceX,
//     sourceY,
//     sourcePosition: props.sourcePosition,
//     targetX,
//     targetY,
//     targetPosition: props.targetPosition,
//   });
//   const handleAccept = useCallback(async () => {
//     if (data) {
//       await aiActions.acceptSuggestedConnection({
//         sourceNodeId: props.source,
//         targetNodeId: props.target,
//         reason: props.data?.aiData?.reason ?? "",
//       });
//     }
//   }, [aiActions, data]);

//   const handleDismiss = useCallback(() => {
//     aiActions.dismissSuggestedConnection(id);
//   }, [aiActions, id]);

//   return (
//     <>
//       <path
//         id={id}
//         style={style}
//         className="react-flow__edge-path"
//         d={edgePath}
//         markerEnd={markerEnd}
//       />

//       <EdgeLabelRenderer>
//         <div
//           style={{
//             position: "absolute",
//             transform: `translate(-50%, -120%) translate(${labelX}px,${labelY}px)`, // Adjust vertical position
//             pointerEvents: "all",
//             zIndex: 1, // Ensure buttons are clickable
//           }}
//           className="nodrag nopan flex flex-col items-center gap-1"
//         >
//           {data?.aiData?.reason && (
//             <div className="rounded-sm bg-orange-600/80 px-1.5 py-0.5 text-xs font-medium text-white shadow-sm">
//               {data?.aiData.reason}
//             </div>
//           )}

//           <div className="flex gap-1">
//             <Button
//               size="sm"
//               variant="success"
//               onClick={handleAccept}
//               className="text-xs h-6 px-1.5 py-0.5"
//             >
//               Accept
//             </Button>

//             <Button
//               size="sm"
//               variant="destructive"
//               onClick={handleDismiss}
//               className="text-xs h-6 px-1.5 py-0.5"
//             >
//               Dismiss
//             </Button>
//           </div>
//         </div>
//       </EdgeLabelRenderer>
//     </>
//   );
// };

// const SuggestedConnectionEdge = memo(SuggestedConnectionEdgeComponent);
// SuggestedConnectionEdge.displayName = "SuggestedConnectionEdge";
// export default SuggestedConnectionEdge;

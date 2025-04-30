import { supabaseClient } from "@/helpers/supabase/client";
import { ShowNotification } from "@/hooks/use-notifications";
import { AiConnectionSuggestion } from "@/types/ai-connection-suggestion";
import { addEdge, EdgeProps, useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";

export default function SuggestedConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  data, // Contains the reason, sourceNodeId, targetNodeId
  markerEnd,
}: EdgeProps<AiConnectionSuggestion>) {
  const { setEdges, getNodes } = useReactFlow();
  const [showActions, setShowActions] = useState(false);
  const reactFlowInstance = useReactFlow(); // Get instance here
  const showNotification: ShowNotification | undefined = reactFlowInstance
    .getNodes()
    .find((n) => n.id === "notification-placeholder")?.data
    ?.showNotification as ShowNotification | undefined; // Hacky way to access showNotification

  const edgePath = `M ${sourceX},${sourceY} C ${sourceX} ${targetY} ${targetX} ${sourceY} ${targetX},${targetY}`; // Simple bezier curve

  const handleAccept = useCallback(async () => {
    // Find the source and target nodes to get their data
    const sourceNode = getNodes().find((n) => n.id === data?.sourceNodeId);
    const targetNode = getNodes().find((n) => n.id === data?.targetNodeId);

    if (sourceNode && targetNode) {
      // Save the new edge permanently by updating the target node's parent_id
      const { error } = await supabaseClient
        .from("nodes")
        .update({ parent_id: sourceNode.id })
        .eq("id", targetNode.id);

      if (error) {
        console.error("Error saving accepted edge:", error);
        showNotification?.("Failed to save accepted connection.", "error");
        return;
      }

      // Remove the suggested edge and add the permanent edge locally
      setEdges((eds) => eds.filter((edge) => edge.id !== id));
      setEdges((eds) =>
        addEdge(
          {
            id: `e${sourceNode.id}-${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            animated: false, // Permanent edges are not animated
            type: "smoothstep", // Match default edge type
          },
          eds,
        ),
      );

      // TODO: Add state to history after accepting - need access to addStateToHistory
      showNotification?.("Connection accepted.", "success");
    } else {
      console.error(
        "Source or target node not found for suggested edge:",
        data,
      );
      showNotification?.(
        "Error accepting connection: Node not found.",
        "error",
      );
    }
  }, [id, data, setEdges, getNodes, showNotification]); // Add dependencies

  const handleDismiss = useCallback(() => {
    // Remove the suggested edge locally
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
    // TODO: Add state to history after dismissing - need access to addStateToHistory
    showNotification?.("Connection dismissed.", "success");
  }, [id, setEdges, showNotification]); // Add dependencies

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      />
      {showActions && (
        <g
          transform={`translate(${(sourceX + targetX) / 2}, ${(sourceY + targetY) / 2})`}
        >
          <rect
            x="-40"
            y="-20"
            width="80"
            height="40"
            fill="white"
            stroke="#ccc"
            strokeWidth="1"
            rx="5"
            ry="5"
          />

          <text
            x="0"
            y="-5"
            className="react-flow__edge-text"
            textAnchor="middle"
            alignmentBaseline="middle"
            style={{ fontSize: "10px", pointerEvents: "none" }}
          >
            {`${data?.reason}` || "Suggested"}
          </text>

          <text
            x="-20"
            y="10"
            className="react-flow__edge-button"
            textAnchor="middle"
            alignmentBaseline="middle"
            style={{ fontSize: "10px", cursor: "pointer" }}
            onClick={handleAccept}
          >
            Accept
          </text>

          <text
            x="20"
            y="10"
            className="react-flow__edge-button"
            textAnchor="middle"
            alignmentBaseline="middle"
            style={{ fontSize: "10px", cursor: "pointer" }}
            onClick={handleDismiss}
          >
            Dismiss
          </text>
        </g>
      )}
    </>
  );
}

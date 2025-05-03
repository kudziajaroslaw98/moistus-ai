import { supabaseClient } from "@/helpers/supabase/client";
import { ShowNotification } from "@/hooks/use-notifications";
import { AiConnectionSuggestion } from "@/types/ai-connection-suggestion";
import { EdgeData } from "@/types/edge-data";
import { addEdge, Edge, EdgeProps, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";

const SuggestedConnectionEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  ...props
}: EdgeProps<AiConnectionSuggestion>) => {
  const data = props.data as EdgeData;
  const style = props.style as Edge["style"];
  const { setEdges, getNodes } = useReactFlow();
  const reactFlowInstance = useReactFlow();
  const showNotification: ShowNotification | undefined = reactFlowInstance
    .getNodes()
    .find((n) => n.id === "notification-placeholder")?.data
    ?.showNotification as ShowNotification | undefined;

  const edgePath = `M ${sourceX},${sourceY} C ${sourceX} ${targetY} ${targetX} ${sourceY} ${targetX},${targetY}`;

  const handleAccept = useCallback(async () => {
    const sourceNode = getNodes().find((n) => n.id === data?.sourceNodeId);
    const targetNode = getNodes().find((n) => n.id === data?.targetNodeId);

    if (sourceNode && targetNode) {
      const { error } = await supabaseClient
        .from("nodes")
        .update({ parent_id: sourceNode.id })
        .eq("id", targetNode.id);

      if (error) {
        console.error("Error saving accepted edge:", error);
        showNotification?.("Failed to save accepted connection.", "error");
        return;
      }

      setEdges((eds) => eds.filter((edge) => edge.id !== id));
      setEdges((eds) =>
        addEdge(
          {
            id: `e${sourceNode.id}-${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            animated: false,
            type: "smoothstep",
          },
          eds,
        ),
      );

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
  }, [id, data, setEdges, getNodes, showNotification]);

  const handleDismiss = useCallback(() => {
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
    showNotification?.("Connection dismissed.", "success");
  }, [id, setEdges, showNotification]);

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={props.markerEnd}
      />

      <g
        transform={`translate(${(sourceX + targetX) / 2}, ${(sourceY + targetY) / 2})`}
      >
        <text
          x="0"
          y="-5"
          className="react-flow__edge-text"
          textAnchor="middle"
          alignmentBaseline="middle"
          style={{ fontSize: "12px", pointerEvents: "none", stroke: "white" }}
        >
          {`${data?.reason}` || "Suggested"}
        </text>

        <text
          x="-20"
          y="10"
          className="react-flow__edge-button"
          textAnchor="middle"
          alignmentBaseline="middle"
          style={{ fontSize: "12px", cursor: "pointer", stroke: "green" }}
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
          style={{ fontSize: "12px", cursor: "pointer", stroke: "red" }}
          onClick={handleDismiss}
        >
          Dismiss
        </text>
      </g>
    </>
  );
};

const SuggestedConnectionEdge = memo(SuggestedConnectionEdgeComponent);
SuggestedConnectionEdge.displayName = "SuggestedConnectionEdge";
export default SuggestedConnectionEdge;

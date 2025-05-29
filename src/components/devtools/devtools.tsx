import { Panel } from "@xyflow/react";
import {
  useState,
  type Dispatch,
  type HTMLAttributes,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ChangeLogger, NodeInspector } from "../devtools";

export default function DevTools() {
  const [nodeInspectorActive, setNodeInspectorActive] = useState(true);
  const [changeLoggerActive, setChangeLoggerActive] = useState(true);

  return (
    <div className="react-flow__devtools">
      <Panel position="bottom-left">
        <DevToolButton
          setActive={setNodeInspectorActive}
          active={nodeInspectorActive}
          title="Toggle Node Inspector"
        >
          Node Inspector
        </DevToolButton>

        <DevToolButton
          setActive={setChangeLoggerActive}
          active={changeLoggerActive}
          title="Toggle Change Logger"
        >
          Change Logger
        </DevToolButton>
      </Panel>

      {changeLoggerActive && <ChangeLogger />}

      {nodeInspectorActive && <NodeInspector />}
    </div>
  );
}

function DevToolButton({
  active,
  setActive,
  children,
  ...rest
}: {
  active: boolean;
  setActive: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
} & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={() => setActive((a) => !a)}
      className={active ? "active" : ""}
      {...rest}
    >
      {children}
    </button>
  );
}

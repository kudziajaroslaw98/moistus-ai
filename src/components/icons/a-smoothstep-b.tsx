import { ComponentPropsWithRef } from "react";

const ASmoothstepBIcon = (props: ComponentPropsWithRef<"svg">) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 64 64"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        fillRule: "evenodd",
        clipRule: "evenodd",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }}
      className={props.className}
    >
      <g
        id="a-smoothstep-b.svg"
        transform="matrix(0.0593388,0,0,0.0593388,31.9586,31.9586)"
      >
        <g transform="matrix(1,0,0,1,-540,-540)">
          <g transform="matrix(47.2735,0,0,-47.2735,-27.2822,1107.28)">
            <circle
              cx="18"
              cy="18"
              r="3"
              style={{
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2px",
              }}
            />
          </g>

          <g transform="matrix(47.2735,0,0,-47.2735,-27.2822,1107.28)">
            <circle
              cx="6"
              cy="6"
              r="3"
              style={{
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2px",
              }}
            />
          </g>

          <g transform="matrix(-47.2735,0,0,47.2735,1108.75,-44.8118)">
            <path
              d="M9.516,6L16,6C17.097,6 18,6.903 18,8L18,15"
              style={{
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2px",
              }}
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

ASmoothstepBIcon.displayName = "ASmoothstepBIcon";

export default ASmoothstepBIcon;

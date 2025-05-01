import { ComponentPropsWithRef } from "react";

const AStrainghtBIcon = (props: ComponentPropsWithRef<"svg">) => {
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
        id="a-straight-b.svg"
        transform="matrix(0.059221,0,0,0.059221,31.7386,31.7727)"
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
          <g transform="matrix(33.4274,33.4274,30.4433,-30.4433,-110.803,802.872)">
            <path
              d="M6,9L6,21"
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

AStrainghtBIcon.displayName = "AStrainghtBIcon";

export default AStrainghtBIcon;

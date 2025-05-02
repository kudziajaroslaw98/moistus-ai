import { ComponentPropsWithRef } from "react";

const ABezierBIcon = (props: ComponentPropsWithRef<"svg">) => {
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
      <g transform="matrix(0.05899,0,0,0.05899,0.2314,-0.3956)">
        <g id="a-step-b.svg">
          <g>
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
                d="M9.516,6C9.516,6 9.516,6 9.517,6C11.766,5.999 13.924,6.892 15.515,8.482C17.106,10.072 18,12.23 18,14.479L18,15"
                style={{
                  fill: "none",
                  fillRule: "nonzero",
                  stroke: "currentColor",
                  strokeWidth: "2px",
                  strokeLinejoin: "miter",
                }}
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};

ABezierBIcon.displayName = "ABezierBIcon";

export default ABezierBIcon;

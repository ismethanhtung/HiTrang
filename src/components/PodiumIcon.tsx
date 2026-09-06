import React from "react";

export function Podium({
    className = "w-5 h-5",
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Base line */}
            <path d="M2 20h20" />
            {/* 2nd place - Left step */}
            <path d="M4 20v-8a1 1 0 0 1 1-1h3.5" />
            {/* 1st place - Center step (tallest) */}
            <path d="M8.5 20V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v15" />
            {/* 3rd place - Right step */}
            <path d="M15.5 13h3.5a1 1 0 0 1 1 1v6" />
            {/* Inner vertical dividers */}
            <path d="M8.5 11v9" />
            <path d="M15.5 13v7" />
        </svg>
    );
}

export default Podium;

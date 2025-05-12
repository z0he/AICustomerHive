import React from "react";

interface LogoProps {
  width?: number;
  height?: number;
}

const AIcrmLogo: React.FC<LogoProps> = ({ width = 40, height = 40 }) => {
  return (
    <div className="flex items-center">
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="50" fill="#0082AE" />
        <path
          d="M36 35C39.3137 35 42 37.6863 42 41C42 44.3137 39.3137 47 36 47C32.6863 47 30 44.3137 30 41C30 37.6863 32.6863 35 36 35Z"
          fill="white"
        />
        <path
          d="M64 35C67.3137 35 70 37.6863 70 41C70 44.3137 67.3137 47 64 47C60.6863 47 58 44.3137 58 41C58 37.6863 60.6863 35 64 35Z"
          fill="white"
        />
        <path
          d="M50 53C53.3137 53 56 55.6863 56 59C56 62.3137 53.3137 65 50 65C46.6863 65 44 62.3137 44 59C44 55.6863 46.6863 53 50 53Z"
          fill="white"
        />
        <path
          d="M35 65L39 60L45 65L43 70L35 65Z"
          fill="white"
        />
        <path
          d="M65 65L61 60L55 65L57 70L65 65Z"
          fill="white"
        />
        <path 
          d="M36 47L50 53" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        <path 
          d="M64 47L50 53" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        <path 
          d="M36 47L36 59" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        <path 
          d="M64 47L64 59" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
      </svg>
      <span className="ml-2 text-xl font-bold text-[#0082AE]">AICRM</span>
    </div>
  );
};

export default AIcrmLogo;
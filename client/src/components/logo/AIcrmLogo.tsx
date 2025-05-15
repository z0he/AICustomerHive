import React from "react";

interface LogoProps {
  width?: number;
  height?: number;
}

const AIcrmLogo: React.FC<LogoProps> = ({ width = 200, height = 70 }) => {
  return (
    <div className="flex items-center">
      <img 
        src="/assets/images/logo.png" 
        alt="AICRM Logo" 
        width={width} 
        height={height}
        className="object-contain"
      />
    </div>
  );
};

export default AIcrmLogo;
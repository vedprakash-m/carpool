"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoadingSpinner;
function LoadingSpinner({ size = "md", color = "primary", text, className = "", }) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
    };
    const colorClasses = {
        primary: "border-primary-600",
        white: "border-white",
        gray: "border-gray-600",
    };
    return (<div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`}/>
      {text && <p className="mt-3 text-sm text-gray-600">{text}</p>}
    </div>);
}

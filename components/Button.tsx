import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-pingpong-blue text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30",
    secondary: "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600",
    danger: "bg-pingpong-red text-white hover:bg-red-600 shadow-lg shadow-red-500/30",
    success: "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-500/30",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
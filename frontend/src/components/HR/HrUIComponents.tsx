// @ts-nocheck
import React from 'react';
import { THEME } from './HrMockData';

export const Button = ({ children, variant = 'primary', size = 'md', className = '', icon: Icon, onClick, fullWidth, disabled }: any) => {
  const sizes: any = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-6 py-3.5 text-base" };
  const base = "rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: any = {
    primary: "bg-gradient-to-r from-[#22d3ee] to-[#d946ef] text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(217,70,239,0.5)] border-0",
    secondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', noPadding = false }: any) => (
  <div className={`${THEME.gradients.surface} rounded-xl overflow-hidden ${noPadding ? '' : 'p-6'} ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, status = 'default' }: any) => {
  const styles: any = {
    default: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Recommended: "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20",
    Review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    "In Progress": "bg-[#d946ef]/10 text-[#d946ef] border-[#d946ef]/20"
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${styles[status] || styles.default} whitespace-nowrap`}>
      {children}
    </span>
  );
};

export const Avatar = ({ initials, src, size = 'md' }: any) => {
  const sizes: any = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl", xl: "w-24 h-24 text-2xl" };
  const colors = [
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ];
  const colorIdx = initials ? initials.charCodeAt(0) % colors.length : 0;

  if (src) {
    return (
      <img src={src} className={`${sizes[size]} rounded-full object-cover border-2 border-white/10`} alt="Avatar" />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold border ${colors[colorIdx]} flex-shrink-0`}>
      {initials}
    </div>
  );
};

export const RadarChart = () => (
  <div className="relative w-full max-w-[200px] aspect-square mx-auto">
    <svg viewBox="0 0 100 100" className="w-full h-full text-[#22d3ee] overflow-visible">
      <polygon points="50,10 90,50 50,90 10,50" fill="none" stroke="rgba(255,255,255,0.1)" />
      <polygon points="50,25 75,50 50,75 25,50" fill="none" stroke="rgba(255,255,255,0.1)" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="rgba(255,255,255,0.1)" />
      <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(255,255,255,0.1)" />

      {/* Data Polygon */}
      <polygon points="50,15 85,50 50,85 20,50" fill="rgba(34, 211, 238, 0.2)" stroke="#22d3ee" strokeWidth="2" />

      {/* Labels */}
      <text x="50" y="5" textAnchor="middle" fill="gray" fontSize="8">Technical</text>
      <text x="95" y="50" textAnchor="start" fill="gray" fontSize="8">Comm.</text>
      <text x="50" y="100" textAnchor="middle" fill="gray" fontSize="8">Confidence</text>
      <text x="5" y="50" textAnchor="end" fill="gray" fontSize="8">Culture</text>
    </svg>
  </div>
);

export const BarChart = ({ value, label, color }: any) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-bold">{value}%</span>
    </div>
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);

import React from 'react';
import type { StatProps } from '../types';
export const StatCard: React.FC<StatProps> = ({ title, value, color, icon }) => {
  // Mapping warna tailwind berdasarkan props color
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    orange: "bg-orange-600",
  };

  return (
    <div className={`${colorClasses[color]} text-white rounded-lg p-4 shadow-sm flex justify-between items-center h-24`}>
      <div className="flex flex-col justify-between h-full">
        <span className="text-sm font-medium opacity-90">{title}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <div className="opacity-80 scale-125 transform p-2">
        {icon}
      </div>
    </div>
  );
};
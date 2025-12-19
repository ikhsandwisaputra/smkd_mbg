import React from 'react';
import type { KitchenProps } from '../types';
export const KitchenCard: React.FC<KitchenProps> = ({ name, code, head, location, status }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-800 font-semibold text-lg">{name}</h3>
          <div className="text-gray-500 text-sm mt-1 space-y-1">
            <p>No: {code}</p>
            <p>Kepala: {head}</p>
            <p>{location}</p>
          </div>
        </div>
        
        {/* Badge Status */}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {status}
        </span>
      </div>
    </div>
  );
};
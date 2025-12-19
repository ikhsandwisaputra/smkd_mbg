import React from 'react';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-white border-b border-red-500 sticky top-0 z-10">
      <div className="container mx-auto px-4 flex gap-6">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'dashboard'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onTabChange('monitoring')}
          className={`py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'monitoring'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Monitoring Kualitas
        </button>
      </div>
    </div>
  );
};
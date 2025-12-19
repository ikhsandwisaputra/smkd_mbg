import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, ChevronDown, LogOut } from 'lucide-react';
import type { UserProfile } from '../api';

interface HeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleSidebar }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.full_name || user?.email || 'User';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 right-0 left-0 md:left-0 z-30 transition-all duration-300">
      <div className="h-full px-4 flex justify-between items-center">
        
        {/* KIRI: Burger Menu (Mobile Only) & Breadcrumb Placeholder */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSidebar}
            className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          
          {/* Spacer untuk Desktop agar konten tidak tertutup sidebar yang expanded */}
          <div className="hidden md:block w-4"></div> 
        </div>

        {/* KANAN: User Profile */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-2 pr-1 py-1.5 hover:bg-gray-50 rounded-full border border-transparent hover:border-gray-200 transition-all"
          >
            <div className="text-right hidden sm:block mr-1">
              <p className="text-xs font-bold text-gray-700 leading-tight">{displayName}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide text-right">{user?.role}</p>
            </div>
            
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center border border-blue-200 shadow-sm">
              <User size={16} strokeWidth={2.5} />
            </div>
            
            <ChevronDown size={14} className={`text-gray-400 transition-transform mr-1 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-gray-50 sm:hidden">
                 <p className="text-sm font-bold text-gray-800">{displayName}</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
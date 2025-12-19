import React from 'react';
import { 
  LayoutDashboard, Activity, ChefHat, Users, ClipboardList, 
  LogOut, ChevronLeft, ChevronRight, X 
} from 'lucide-react';
import type { UserProfile } from '../api'; // Pastikan path import api benar (../api jika di dalam components/)
 // Pastikan path import api benar (../api jika di dalam components/)

// [FIX] Tambahkan adminOnly?: boolean di sini
export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean; 
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
  navItems: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, setIsOpen, isCollapsed, setIsCollapsed, 
  activeTab, onTabChange, user, onLogout, navItems 
}) => {
  
  const handleTabClick = (id: string) => {
    onTabChange(id);
    setIsOpen(false); // Tutup sidebar otomatis di mobile
  };

  return (
    <>
      {/* OVERLAY MOBILE */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* SIDEBAR CONTAINER */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out shadow-xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
          w-72
        `}
      >
        <div className="flex flex-col h-full">
          
          {/* 1. HEADER LOGO */}
          <div className={`h-16 flex items-center border-b border-gray-100 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-blue-600 text-white rounded-lg w-9 h-9 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm shadow-blue-200">
                  MBG
                </div>
                {!isCollapsed && (
                  <div className="animate-in fade-in duration-200">
                    <h1 className="font-bold text-gray-800 text-lg leading-none">Monitoring</h1>
                    <span className="text-[10px] text-gray-400 font-medium tracking-wider">DASHBOARD</span>
                  </div>
                )}
             </div>
             
             {/* Tombol Close di Mobile */}
             <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">
               <X size={20} />
             </button>
          </div>

          {/* 2. MENU ITEMS */}
          <nav className="flex-1 py-6 px-3 space-y-1 custom-scrollbar">
             {navItems.map((item) => {
               // [LOGIC] Sembunyikan jika menu khusus admin tapi user bukan admin
               if (item.adminOnly && user?.role !== 'admin') return null;
               
               const isActive = activeTab === item.id;
               return (
                 <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    title={isCollapsed ? item.label : ''}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                      ${isActive 
                        ? 'bg-blue-50 text-blue-600 font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                 >
                    <div className={`${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                      {item.icon}
                    </div>
                    
                    {!isCollapsed && (
                      <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                        {item.label}
                      </span>
                    )}

                    {/* Tooltip saat collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                      </div>
                    )}
                 </button>
               )
             })}
          </nav>

          {/* 3. FOOTER */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
             {/* Tombol Collapse Desktop */}
             <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex w-full items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mb-2"
             >
                {isCollapsed ? <ChevronRight size={20}/> : <div className="flex items-center gap-2 text-xs font-bold uppercase"><ChevronLeft size={16}/> Sembunyikan</div>}
             </button>

             {/* User Info Kecil */}
             <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                {!isCollapsed && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-gray-800 truncate">{user?.full_name?.split(' ')[0]}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold truncate">{user?.role?.replace('_', ' ')}</p>
                  </div>
                )}
                <button onClick={onLogout} title="Logout" className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                   <LogOut size={18} />
                </button>
             </div>
          </div>

        </div>
      </aside>
    </>
  );
};
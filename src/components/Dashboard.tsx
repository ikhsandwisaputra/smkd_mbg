import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Activity, ChefHat, Users, ClipboardList, Clock, 
  CheckCircle, AlertTriangle, MapPin, Hash, ShieldCheck, User 
} from 'lucide-react';
import { Header } from './Header';
import { Sidebar, type NavItem } from './Sidebar'; 
import { KitchenManager } from './KitchenManager';
import { UserManager } from './UserManager';
import { MonitoringScanner } from './MonitoringScanner';
import { PengujianManager } from './PengujianManager';
import { ApprovalManager } from './ApprovalManager';
import { DashboardCharts } from './DashboardCharts';
import { 
  getKitchens, getUsers, getPengujianList, getKitchenDetail, 
  type UserProfile, type PengujianResult, type Kitchen 
} from '../api';
import { getLogs, type ActivityLog } from '../history';

interface DashboardProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // STATE UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 

  // STATE DATA
  const [totalDapur, setTotalDapur] = useState(0);
  const [totalUser, setTotalUser] = useState(0);
  const [totalPositif, setTotalPositif] = useState(0);
  const [totalNegatif, setTotalNegatif] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  
  // [BARU] State untuk Detail Dapur Lengkap
  const [myKitchen, setMyKitchen] = useState<Kitchen | null>(null);

  const [allPengujian, setAllPengujian] = useState<PengujianResult[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [editPengujianData, setEditPengujianData] = useState<PengujianResult | null>(null);

  const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: <LayoutDashboard size={20} /> },
    { id: 'approval', label: 'Persetujuan Data', icon: <ShieldCheck size={20} /> },
    { id: 'monitoring', label: 'Scan Sampel', icon: <Activity size={20} /> },
    { id: 'pengujian', label: 'Data Pengujian', icon: <ClipboardList size={20} /> },
    { id: 'dapur', label: 'Unit Dapur', icon: <ChefHat size={20} />, adminOnly: true },
    { id: 'user', label: 'Pengguna', icon: <Users size={20} />, adminOnly: true },
  ];

  const visibleNavItems = NAV_ITEMS.filter(item => {
      if (item.id === 'monitoring') {
          return user?.role === 'admin' || user?.role === 'petugas_monitoring';
      }
      if (item.adminOnly) return user?.role === 'admin';
      return true;
  });

  const refreshDashboardData = async () => {
    setLoadingStats(true);
    try {
      // 1. Fetch Data Dasar (Dapur & Pengujian)
      const [dapurs, pengujian] = await Promise.all([
          getKitchens(), 
          getPengujianList()
      ]);
      
      // 2. [BARU] Fetch Detail Dapur (Jika User punya dapur_id & BUKAN Admin)
      if (user?.role !== 'admin' && user?.dapur_id) {
          try {
              const detail = await getKitchenDetail(user.dapur_id);
              setMyKitchen(detail);
          } catch (e) {
              console.error("Gagal ambil detail dapur", e);
          }
      }

      // 3. Fetch User (Hanya Admin)
      if (user?.role === 'admin') {
          try {
            const users = await getUsers();
            setTotalUser(users.length);
          } catch (e) { /* ignore */ }
      }

      setTotalDapur(dapurs.length);
      setAllPengujian(pengujian);
      
      let positif = 0; let negatif = 0;
      pengujian.forEach(item => {
          const threshold = item.baku_mutu === 0 ? 0 : item.baku_mutu;
          if (item.hasil_interpretasi > threshold) positif++; else negatif++;
      });
      setTotalPositif(positif);
      setTotalNegatif(negatif);

      let pendingCount = 0;
      pengujian.forEach(item => {
          if (user?.role === 'admin') {
              if (item.status_petugas === 'pending' || item.status_chef === 'pending' || item.status_kepala === 'pending') pendingCount++;
          } else if (user?.role === 'petugas_monitoring' && item.status_petugas === 'pending') {
              pendingCount++;
          } else if (user?.role === 'kepala_chef' && item.status_chef === 'pending') {
              pendingCount++;
          } else if (user?.role === 'kepala_dapur' && item.status_kepala === 'pending') {
              pendingCount++;
          }
      });
      setPendingApprovals(pendingCount);
      setRecentLogs(getLogs());

    } catch (error) { 
        console.error("Gagal refresh dashboard", error); 
    } finally { 
        setLoadingStats(false); 
    }
  };

  useEffect(() => { if (user) refreshDashboardData(); }, [activeTab, user]);

  const handleEditPengujian = (item: PengujianResult) => { setEditPengujianData(item); setActiveTab('monitoring'); };
  const handleCancelEdit = () => { setEditPengujianData(null); setActiveTab('pengujian'); };
  
  const formatTime = (isoString: string) => {
    try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(isoString)); } catch (e) { return "-"; }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex overflow-hidden"> 
      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed}
        activeTab={activeTab} onTabChange={setActiveTab}
        user={user} onLogout={onLogout} navItems={visibleNavItems} 
      />

      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} onLogout={onLogout} onToggleSidebar={() => setIsSidebarOpen(true)} />

        <main className="p-4 md:p-8 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
            
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                    </h1>
                    <p className="text-sm text-gray-500">Sistem Monitoring Kualitas Pangan MBG</p>
                </div>
                {pendingApprovals > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 animate-pulse shadow-sm cursor-pointer" onClick={() => setActiveTab('approval')}>
                        <AlertTriangle size={16} />
                        Anda memiliki {pendingApprovals} data perlu persetujuan
                    </div>
                )}
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {user?.role === 'admin' ? (
                        <>
                            {/* TAMPILAN ADMIN */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-blue-600 text-white rounded-xl p-4 shadow-lg relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><ChefHat size={60} /></div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">Total Dapur</p>
                                    <h3 className="text-3xl font-bold">{loadingStats ? '...' : totalDapur}</h3>
                                </div>
                                <div className="bg-indigo-600 text-white rounded-xl p-4 shadow-lg relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><Users size={60} /></div>
                                    <p className="text-indigo-100 text-sm font-medium mb-1">Total User</p>
                                    <h3 className="text-3xl font-bold">{loadingStats ? '...' : totalUser}</h3>
                                </div>
                                <div className="bg-emerald-500 text-white rounded-xl p-4 shadow-lg relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><CheckCircle size={60} /></div>
                                    <p className="text-emerald-100 text-sm font-medium mb-1">Lolos Uji (Aman)</p>
                                    <h3 className="text-3xl font-bold">{loadingStats ? '...' : totalNegatif}</h3>
                                </div>
                                <div className="bg-red-500 text-white rounded-xl p-4 shadow-lg relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><AlertTriangle size={60} /></div>
                                    <p className="text-red-100 text-sm font-medium mb-1">Perlu Tindakan</p>
                                    <h3 className="text-3xl font-bold">{loadingStats ? '...' : totalPositif}</h3>
                                </div>
                            </div>
                            <DashboardCharts data={allPengujian} />
                            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                                    <Clock className="text-blue-600" size={18} />
                                    <h3 className="font-bold text-gray-800">Riwayat Aktivitas Terbaru</h3>
                                </div>
                                <ul className="divide-y divide-gray-50">
                                    {recentLogs.length === 0 ? (
                                        <li className="p-8 text-center text-gray-400">Belum ada aktivitas.</li>
                                    ) : recentLogs.map((log) => (
                                        <li key={log.id} className="p-4 flex gap-4 items-start hover:bg-gray-50 transition-colors">
                                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.action === 'DELETE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {log.action === 'DELETE' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-800">{log.description}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{log.module}</span>
                                                    <span className="text-xs text-gray-400">• {formatTime(log.timestamp)}</span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    ) : (
                        // TAMPILAN USER (NON-ADMIN)
                        <div className="space-y-6">
                            
                            {/* KARTU INFORMASI DAPUR LENGKAP */}
                            {myKitchen && (
                                <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><ChefHat size={120} className="text-blue-600"/></div>
                                    
                                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <ChefHat className="text-blue-600" size={24}/> Informasi Unit Dapur
                                        </h3>
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                                            ID: {myKitchen.nomor_dapur}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                        {/* INFO DASAR */}
                                        <div className="space-y-4">
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                <p className="text-xs text-blue-500 uppercase font-bold mb-1">Nama Unit</p>
                                                <p className="text-xl font-bold text-blue-900">{myKitchen.nama_dapur}</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><MapPin size={12}/> Lokasi</p>
                                                <p className="text-sm font-medium text-gray-700">{myKitchen.lokasi}</p>
                                            </div>
                                        </div>

                                        {/* STRUKTUR ORGANISASI */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-indigo-200"><User size={18}/></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400">Kepala Dapur</p>
                                                    <p className="text-sm font-bold text-gray-800">{myKitchen.kepala_dapur_nama}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 border border-orange-200"><ChefHat size={18}/></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400">Kepala Chef</p>
                                                    <p className="text-sm font-bold text-gray-800">{myKitchen.kepala_chef_nama}</p>
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Tim Monitoring</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {myKitchen.petugas_monitoring_names && myKitchen.petugas_monitoring_names.length > 0 ? (
                                                        myKitchen.petugas_monitoring_names.map((name, idx) => (
                                                            <span key={idx} className="text-xs bg-green-50 border border-green-200 px-2 py-1 rounded-md text-green-700 font-medium">{name}</span>
                                                        ))
                                                    ) : <span className="text-xs text-gray-400 italic">- Belum ada petugas -</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* QUICK ACTIONS */}
                            <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm mt-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Aktivitas Hari Ini</h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">Silakan pilih menu di bawah ini untuk memulai tugas Anda.</p>
                                
                                <div className="flex flex-wrap justify-center gap-4">
                                    {user?.role === 'petugas_monitoring' && (
                                        <button onClick={() => setActiveTab('monitoring')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all transform hover:-translate-y-1 flex items-center gap-2">
                                            <Activity size={18}/> Mulai Scan Sampel
                                        </button>
                                    )}
                                    <button onClick={() => setActiveTab('approval')} className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all transform hover:-translate-y-1 flex items-center gap-2 relative group">
                                        <ShieldCheck size={18} className="text-blue-600 group-hover:text-blue-700"/> 
                                        Cek Persetujuan
                                        {pendingApprovals > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 absolute -top-2 -right-2 animate-bounce border-2 border-white">
                                                {pendingApprovals}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'monitoring' && <MonitoringScanner user={user} editData={editPengujianData} onCancelEdit={handleCancelEdit} />}
            {activeTab === 'approval' && <ApprovalManager user={user} onDataChange={refreshDashboardData} />}
            {activeTab === 'pengujian' && <PengujianManager user={user} onEdit={handleEditPengujian} />}
            {user?.role === 'admin' && activeTab === 'dapur' && <KitchenManager />}
            {user?.role === 'admin' && activeTab === 'user' && <UserManager />}

        </main>
      </div>
    </div>
  );
};